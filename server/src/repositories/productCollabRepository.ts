import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

/** 미확인 스레드 집계: 이 일시 이후 작성된 메시지·답글만 포함 (그 이전 기록은 집계 제외) */
const PRODUCT_COLLAB_THREAD_UNREAD_SINCE = '2026-04-18 00:00:00';
import type {
  ProductCollabProduct,
  ProductCollabProductListItem,
  ProductCollabProductDetail,
  ProductCollabMessage,
  ProductCollabAttachment,
  ProductCollabMention,
  ProductCollabProductImage,
  CreateProductCollabProductDTO,
  UpdateProductCollabProductDTO,
  CreateMessageDTO,
  UpdateMessageDTO,
  DashboardMyTask,
  DashboardTeamTask,
  DashboardAllAssigneeTask,
  DashboardStatusCount,
  DashboardConfirmation,
  DashboardReplyItem,
} from '../models/productCollab.js';

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  status: string;
  category: string | null;
  assignee_id: string | null;
  main_image_id: number | null;
  price: string | null;
  moq: string | null;
  lead_time: string | null;
  packaging: string | null;
  inner_packaging?: string | null;
  sku_count: string | null;
  last_activity_at: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface MessageRow extends RowDataPacket {
  id: number;
  product_id: number;
  parent_id: number | null;
  author_id: string;
  body: string | null;
  body_translated?: string | null;
  body_lang?: string | null;
  body_translation_provider?: string | null;
  tag: string | null;
  created_at: Date;
  updated_at: Date;
  author_name: string | null;
}

/** DB JSON 배열 컬럼을 string[] 로 파싱 */
function parseJsonStringArray(val: unknown): string[] | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  if (typeof val === 'string') {
    try {
      const arr = JSON.parse(val) as unknown;
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** DB 행에서 번역 필드 읽기 (컬럼명 대소문자 차이 대응) */
function getMessageTranslated(row: MessageRow | Record<string, unknown>): string | null {
  const r = row as Record<string, unknown>;
  const v = r.body_translated ?? r.BODY_translated ?? r.body_Translated;
  return typeof v === 'string' && v.trim() ? v : null;
}
function getMessageLang(row: MessageRow | Record<string, unknown>): string | null {
  const r = row as Record<string, unknown>;
  const v = r.body_lang ?? r.BODY_lang ?? r.body_Lang;
  return typeof v === 'string' && v.trim() ? v : null;
}
function getMessageTranslationProvider(row: MessageRow | Record<string, unknown>): 'openai' | 'qwen' | null {
  const r = row as Record<string, unknown>;
  const v = r.body_translation_provider ?? r.body_Translation_provider;
  if (v === 'openai' || v === 'qwen') return v;
  return null;
}

export class ProductCollabRepository {
  async findActiveProducts(
    params: {
      status?: string;
      category?: string;
      assignee_id?: string;
      search?: string;
    },
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: ProductCollabProductListItem[]; total: number }> {
    const conditions: string[] = ["p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')"];
    const values: unknown[] = [];
    if (params.status) {
      conditions.push('p.status = ?');
      values.push(params.status);
    }
    if (params.category) {
      conditions.push('p.category = ?');
      values.push(params.category);
    }
    if (params.assignee_id) {
      conditions.push('p.assignee_id = ?');
      values.push(params.assignee_id);
    }
    if (params.search) {
      conditions.push('(p.name LIKE ? OR EXISTS (SELECT 1 FROM product_collab_messages m WHERE m.product_id = p.id AND m.body LIKE ?))');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    const where = conditions.join(' AND ');

    const usePagination = options?.limit != null && options.limit > 0;
    let total = 0;

    if (usePagination) {
      const [countRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM product_collab_products p WHERE ${where}`,
        values
      );
      total = Number((countRows[0] as { cnt: number }).cnt ?? 0);
    }

    const limitClause = usePagination
      ? ` LIMIT ${Math.max(0, options!.limit!)} OFFSET ${Math.max(0, options!.offset ?? 0)}`
      : '';
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.name, p.status, p.category, p.assignee_id, a.name as assignee_name,
        p.main_image_id, pi.image_url as main_image_url,
        JSON_UNQUOTE(JSON_EXTRACT(p.request_image_urls, '$[0]')) as request_first_image_url,
        p.price, p.last_activity_at,
        (SELECT m.body FROM product_collab_messages m WHERE m.product_id = p.id ORDER BY m.created_at DESC LIMIT 1) as last_message_body,
        (SELECT m.body_translated FROM product_collab_messages m WHERE m.product_id = p.id ORDER BY m.created_at DESC LIMIT 1) as last_message_body_translated,
        (SELECT m.body_lang FROM product_collab_messages m WHERE m.product_id = p.id ORDER BY m.created_at DESC LIMIT 1) as last_message_body_lang,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('user_id', pm.user_id, 'user_name', a2.name))
         FROM product_collab_mentions pm
         LEFT JOIN admin_accounts a2 ON a2.id = pm.user_id
         WHERE pm.message_id = (SELECT id FROM product_collab_messages WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1)) as last_message_mentions
       FROM product_collab_products p
       LEFT JOIN admin_accounts a ON p.assignee_id = a.id
       LEFT JOIN product_collab_product_images pi ON p.main_image_id = pi.id
       WHERE ${where}
       ORDER BY p.last_activity_at DESC${limitClause}`,
      values
    );
    const items = rows.map((r: RowDataPacket) => {
      const raw = r as RowDataPacket & { last_message_mentions?: string | null };
      let last_message_mentions: { user_id: string; user_name?: string | null }[] | undefined;
      if (raw.last_message_mentions != null) {
        if (Array.isArray(raw.last_message_mentions)) {
          last_message_mentions = raw.last_message_mentions.map((x: { user_id?: string; user_name?: string | null }) => ({
            user_id: typeof x?.user_id === 'string' ? x.user_id : '',
            user_name: x?.user_name ?? null,
          }));
        } else if (typeof raw.last_message_mentions === 'string') {
          try {
            const arr = JSON.parse(raw.last_message_mentions) as unknown;
            last_message_mentions = Array.isArray(arr)
              ? arr.map((x: { user_id?: string; user_name?: string | null }) => ({
                  user_id: typeof x?.user_id === 'string' ? x.user_id : '',
                  user_name: x?.user_name ?? null,
                }))
              : undefined;
          } catch {
            last_message_mentions = undefined;
          }
        }
      }
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        category: r.category,
        assignee_id: r.assignee_id,
        assignee_name: r.assignee_name ?? null,
        main_image_id: r.main_image_id,
        main_image_url: r.main_image_url ?? null,
        request_first_image_url: (r as RowDataPacket).request_first_image_url ?? null,
        price: r.price,
        last_activity_at: r.last_activity_at,
        next_action: null,
        last_message_body: raw.last_message_body ?? null,
        last_message_body_translated: (raw as RowDataPacket).last_message_body_translated ?? null,
        last_message_body_lang: (raw as RowDataPacket).last_message_body_lang ?? null,
        last_message_mentions,
      };
    });
    return { items, total: usePagination ? total : items.length };
  }

  async findCompletedProducts(params: { search?: string }): Promise<ProductCollabProductListItem[]> {
    let sql = `SELECT p.id, p.name, p.status, p.category, p.assignee_id, a.name as assignee_name,
      p.main_image_id, pi.image_url as main_image_url,
      JSON_UNQUOTE(JSON_EXTRACT(p.request_image_urls, '$[0]')) as request_first_image_url,
      p.price, p.last_activity_at
      FROM product_collab_products p
      LEFT JOIN admin_accounts a ON p.assignee_id = a.id
      LEFT JOIN product_collab_product_images pi ON p.main_image_id = pi.id
      WHERE p.status = 'PRODUCTION_COMPLETE'`;
    const values: unknown[] = [];
    if (params.search) {
      sql += ' AND p.name LIKE ?';
      values.push(`%${params.search}%`);
    }
    sql += ' ORDER BY p.last_activity_at DESC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, values);
    return rows.map((r: RowDataPacket) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      category: r.category,
      assignee_id: r.assignee_id,
      assignee_name: r.assignee_name ?? null,
      main_image_id: r.main_image_id,
      main_image_url: r.main_image_url ?? null,
      request_first_image_url: (r as RowDataPacket).request_first_image_url ?? null,
      price: r.price,
      last_activity_at: r.last_activity_at,
      next_action: null,
    }));
  }

  async findCancelledProducts(params: { search?: string }): Promise<ProductCollabProductListItem[]> {
    let sql = `SELECT p.id, p.name, p.status, p.category, p.assignee_id, a.name as assignee_name,
      p.main_image_id, pi.image_url as main_image_url,
      JSON_UNQUOTE(JSON_EXTRACT(p.request_image_urls, '$[0]')) as request_first_image_url,
      p.price, p.last_activity_at
      FROM product_collab_products p
      LEFT JOIN admin_accounts a ON p.assignee_id = a.id
      LEFT JOIN product_collab_product_images pi ON p.main_image_id = pi.id
      WHERE p.status = 'CANCELLED'`;
    const values: unknown[] = [];
    if (params.search) {
      sql += ' AND p.name LIKE ?';
      values.push(`%${params.search}%`);
    }
    sql += ' ORDER BY p.last_activity_at DESC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, values);
    return rows.map((r: RowDataPacket) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      category: r.category,
      assignee_id: r.assignee_id,
      assignee_name: r.assignee_name ?? null,
      main_image_id: r.main_image_id,
      main_image_url: r.main_image_url ?? null,
      request_first_image_url: (r as RowDataPacket).request_first_image_url ?? null,
      price: r.price,
      last_activity_at: r.last_activity_at,
      next_action: null,
    }));
  }

  async findProductById(id: number, currentUserId?: string | null): Promise<ProductCollabProductDetail | null> {
    const [productRows] = await pool.execute<ProductRow[]>(
      `SELECT p.*, pi.image_url as main_image_url, a.name as assignee_name
       FROM product_collab_products p
       LEFT JOIN product_collab_product_images pi ON p.main_image_id = pi.id
       LEFT JOIN admin_accounts a ON p.assignee_id = a.id
       WHERE p.id = ?`,
      [id]
    );
    if (!productRows.length) return null;
    const p = productRows[0];
    const product: ProductCollabProductDetail = {
      id: p.id,
      name: p.name,
      status: p.status as ProductCollabProduct['status'],
      category: p.category as ProductCollabProductDetail['category'],
      assignee_id: p.assignee_id,
      main_image_id: p.main_image_id,
      price: p.price,
      moq: p.moq,
      lead_time: p.lead_time,
      packaging: p.packaging,
      inner_packaging: (p as RowDataPacket).inner_packaging ?? null,
      sku_count: p.sku_count,
      request_note: (p as RowDataPacket).request_note ?? null,
      request_note_translated: (p as RowDataPacket).request_note_translated ?? null,
      request_note_lang: (p as RowDataPacket).request_note_lang ?? null,
      request_links: parseJsonStringArray((p as RowDataPacket).request_links) ?? null,
      request_image_urls: parseJsonStringArray((p as RowDataPacket).request_image_urls) ?? null,
      last_activity_at: p.last_activity_at,
      created_at: p.created_at,
      updated_at: p.updated_at,
      created_by: p.created_by,
      updated_by: p.updated_by,
      main_image_url: (p as RowDataPacket).main_image_url ?? null,
      assignee_name: (p as RowDataPacket).assignee_name ?? null,
      messages: [],
      product_images: [],
    };

    const [messageRows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, a.name as author_name
       FROM product_collab_messages m
       LEFT JOIN admin_accounts a ON m.author_id = a.id
       WHERE m.product_id = ? AND m.parent_id IS NULL
       ORDER BY m.created_at DESC`,
      [id]
    );
    const [attachments] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_collab_attachments WHERE message_id IN (SELECT id FROM product_collab_messages WHERE product_id = ?) ORDER BY message_id, display_order',
      [id]
    );
    const [mentions] = await pool.execute<RowDataPacket[]>(
      `SELECT pm.*, a.name as user_name FROM product_collab_mentions pm
       LEFT JOIN admin_accounts a ON pm.user_id = a.id
       WHERE pm.message_id IN (SELECT id FROM product_collab_messages WHERE product_id = ?)`,
      [id]
    );
    const [replies] = await pool.execute<MessageRow[]>(
      `SELECT m.*, a.name as author_name FROM product_collab_messages m
       LEFT JOIN admin_accounts a ON m.author_id = a.id
       WHERE m.product_id = ? AND m.parent_id IS NOT NULL
       ORDER BY m.created_at ASC`,
      [id]
    );

    const attachByMsg = (attachments as ProductCollabAttachment[]).reduce((acc, att) => {
      if (!acc[att.message_id]) acc[att.message_id] = [];
      acc[att.message_id].push(att);
      return acc;
    }, {} as Record<number, ProductCollabAttachment[]>);
    const mentionByMsg = (mentions as RowDataPacket[]).reduce((acc, m) => {
      if (!acc[m.message_id]) acc[m.message_id] = [];
      acc[m.message_id].push({ id: m.id, message_id: m.message_id, user_id: m.user_id, user_name: m.user_name ?? null, created_at: m.created_at });
      return acc;
    }, {} as Record<number, ProductCollabMention[]>);
    const repliesByParent = (replies as MessageRow[]).reduce((acc, r) => {
      const parentId = r.parent_id!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push({
        id: r.id,
        product_id: r.product_id,
        parent_id: r.parent_id,
        author_id: r.author_id,
        body: r.body,
        body_translated: getMessageTranslated(r),
        body_lang: getMessageLang(r),
        body_translation_provider: getMessageTranslationProvider(r),
        tag: r.tag as ProductCollabMessage['tag'],
        created_at: r.created_at,
        updated_at: r.updated_at,
        author_name: r.author_name ?? null,
        attachments: attachByMsg[r.id] ?? [],
        mentions: mentionByMsg[r.id] ?? [],
      });
      return acc;
    }, {} as Record<number, ProductCollabMessage[]>);

    let taskByMessageId: Record<number, { task_id: number; completed_at: Date | null }> = {};
    if (currentUserId) {
      const [taskRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id as task_id, message_id, completed_at FROM product_collab_tasks WHERE product_id = ? AND assignee_id = ?',
        [id, currentUserId]
      );
      taskByMessageId = (taskRows as RowDataPacket[]).reduce((acc, t) => {
        acc[t.message_id] = { task_id: t.task_id, completed_at: t.completed_at ?? null };
        return acc;
      }, {} as Record<number, { task_id: number; completed_at: Date | null }>);
    }

    product.messages = messageRows.map((m) => ({
      id: m.id,
      product_id: m.product_id,
      parent_id: m.parent_id,
      author_id: m.author_id,
      body: m.body,
      body_translated: getMessageTranslated(m),
      body_lang: getMessageLang(m),
      body_translation_provider: getMessageTranslationProvider(m),
      tag: m.tag as ProductCollabMessage['tag'],
      created_at: m.created_at,
      updated_at: m.updated_at,
      author_name: m.author_name ?? null,
      attachments: attachByMsg[m.id] ?? [],
      mentions: mentionByMsg[m.id] ?? [],
      replies: (repliesByParent[m.id] ?? []).map((r) => ({
        ...r,
        current_user_task: taskByMessageId[r.id] ?? null,
      })),
      current_user_task: taskByMessageId[m.id] ?? null,
    }));

    const [images] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_collab_product_images WHERE product_id = ? ORDER BY kind, display_order',
      [id]
    );
    product.product_images = (images as ProductCollabProductImage[]).map((r) => ({
      id: r.id,
      product_id: r.product_id,
      image_url: r.image_url,
      kind: r.kind,
      display_order: r.display_order,
      created_at: r.created_at,
      created_by: r.created_by,
    }));

    return product;
  }

  async createProduct(dto: CreateProductCollabProductDTO): Promise<ProductCollabProduct> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_collab_products (name, status, category, created_by, request_note, request_note_translated, request_note_lang, request_links, request_image_urls)
       VALUES (?, 'RESEARCH', ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.name,
        dto.category ?? null,
        dto.created_by ?? null,
        dto.request_note?.trim() || null,
        dto.request_note_translated ?? null,
        dto.request_note_lang ?? null,
        dto.request_links?.length ? JSON.stringify(dto.request_links) : null,
        dto.request_image_urls?.length ? JSON.stringify(dto.request_image_urls) : null,
      ]
    );
    const row = await this.getProductRow(result.insertId);
    return row!;
  }

  private async getProductRow(id: number): Promise<ProductCollabProduct | null> {
    const [rows] = await pool.execute<ProductRow[]>('SELECT * FROM product_collab_products WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      status: r.status as ProductCollabProduct['status'],
      category: r.category as ProductCollabProduct['category'],
      assignee_id: r.assignee_id,
      main_image_id: r.main_image_id,
      price: r.price,
      moq: r.moq,
      lead_time: r.lead_time,
      packaging: r.packaging,
      inner_packaging: (r as RowDataPacket).inner_packaging ?? null,
      sku_count: r.sku_count,
      request_note: (r as RowDataPacket).request_note ?? null,
      request_note_translated: (r as RowDataPacket).request_note_translated ?? null,
      request_note_lang: (r as RowDataPacket).request_note_lang ?? null,
      request_links: parseJsonStringArray((r as RowDataPacket).request_links) ?? null,
      request_image_urls: parseJsonStringArray((r as RowDataPacket).request_image_urls) ?? null,
      last_activity_at: r.last_activity_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: r.created_by,
      updated_by: r.updated_by,
    };
  }

  async updateProduct(id: number, dto: UpdateProductCollabProductDTO): Promise<ProductCollabProduct | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.category !== undefined) {
      fields.push('category = ?');
      values.push(dto.category);
    }
    if (dto.assignee_id !== undefined) {
      fields.push('assignee_id = ?');
      values.push(dto.assignee_id);
    }
    if (dto.main_image_id !== undefined) {
      fields.push('main_image_id = ?');
      values.push(dto.main_image_id);
    }
    if (dto.price !== undefined) {
      fields.push('price = ?');
      values.push(dto.price);
    }
    if (dto.moq !== undefined) {
      fields.push('moq = ?');
      values.push(dto.moq);
    }
    if (dto.lead_time !== undefined) {
      fields.push('lead_time = ?');
      values.push(dto.lead_time);
    }
    if (dto.packaging !== undefined) {
      fields.push('packaging = ?');
      values.push(dto.packaging);
    }
    if (dto.inner_packaging !== undefined) {
      fields.push('inner_packaging = ?');
      values.push(dto.inner_packaging);
    }
    if (dto.sku_count !== undefined) {
      fields.push('sku_count = ?');
      values.push(dto.sku_count);
    }
    if (dto.request_note !== undefined) {
      fields.push('request_note = ?');
      values.push(dto.request_note?.trim() || null);
    }
    if (dto.request_note_translated !== undefined) {
      fields.push('request_note_translated = ?');
      values.push(dto.request_note_translated);
    }
    if (dto.request_note_lang !== undefined) {
      fields.push('request_note_lang = ?');
      values.push(dto.request_note_lang);
    }
    if (dto.request_links !== undefined) {
      fields.push('request_links = ?');
      values.push(dto.request_links?.length ? JSON.stringify(dto.request_links) : null);
    }
    if (dto.request_image_urls !== undefined) {
      fields.push('request_image_urls = ?');
      values.push(dto.request_image_urls?.length ? JSON.stringify(dto.request_image_urls) : null);
    }
    if (dto.updated_by !== undefined) {
      fields.push('updated_by = ?');
      values.push(dto.updated_by);
    }
    if (fields.length === 0) return this.getProductRow(id);
    values.push(id);
    await pool.execute(`UPDATE product_collab_products SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getProductRow(id);
  }

  async updateLastActivity(productId: number): Promise<void> {
    await pool.execute(
      'UPDATE product_collab_products SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?',
      [productId]
    );
  }

  async createMessage(dto: CreateMessageDTO): Promise<ProductCollabMessage> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_collab_messages (product_id, parent_id, author_id, body, tag)
       VALUES (?, ?, ?, ?, ?)`,
      [dto.product_id, dto.parent_id ?? null, dto.author_id, dto.body ?? null, dto.tag ?? null]
    );
    const messageId = res.insertId;
    if (dto.attachment_urls?.length) {
      for (let i = 0; i < dto.attachment_urls.length; i++) {
        const a = dto.attachment_urls[i];
        await pool.execute(
          'INSERT INTO product_collab_attachments (message_id, kind, url, original_filename, display_order) VALUES (?, ?, ?, ?, ?)',
          [messageId, a.kind, a.url, a.original_filename ?? null, i]
        );
      }
    }
    if (dto.mention_user_ids?.length) {
      for (const uid of dto.mention_user_ids) {
        await pool.execute('INSERT INTO product_collab_mentions (message_id, user_id) VALUES (?, ?)', [messageId, uid]);
        await pool.execute('INSERT INTO product_collab_tasks (product_id, message_id, assignee_id) VALUES (?, ?, ?)', [
          dto.product_id,
          messageId,
          uid,
        ]);
      }
    }
    await this.updateLastActivity(dto.product_id);
    const product = await this.findProductById(dto.product_id);
    const msg = product?.messages?.find((m) => m.id === messageId);
    if (msg) return msg;
    const [rows] = await pool.execute<MessageRow[]>(
      `SELECT m.*, a.name as author_name FROM product_collab_messages m
       LEFT JOIN admin_accounts a ON m.author_id = a.id WHERE m.id = ?`,
      [messageId]
    );
    const m = rows[0];
    return {
      id: m.id,
      product_id: m.product_id,
      parent_id: m.parent_id,
      author_id: m.author_id,
      body: m.body,
      body_translated: getMessageTranslated(m),
      body_lang: getMessageLang(m),
      body_translation_provider: getMessageTranslationProvider(m),
      tag: m.tag as ProductCollabMessage['tag'],
      created_at: m.created_at,
      updated_at: m.updated_at,
      author_name: m.author_name ?? null,
      attachments: [],
      mentions: [],
    };
  }

  async getMessageById(messageId: number): Promise<{ id: number; product_id: number; author_id: string } | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, product_id, author_id FROM product_collab_messages WHERE id = ?',
      [messageId]
    );
    if (!rows.length) return null;
    return { id: rows[0].id, product_id: rows[0].product_id, author_id: rows[0].author_id };
  }

  async updateMessage(
    messageId: number,
    productId: number,
    dto: UpdateMessageDTO
  ): Promise<ProductCollabMessage | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (dto.body !== undefined) {
      fields.push('body = ?');
      values.push(dto.body);
      fields.push('body_translated = NULL', 'body_lang = NULL', 'body_translation_provider = NULL');
    }
    if (dto.tag !== undefined) {
      fields.push('tag = ?');
      values.push(dto.tag);
    }
    if (fields.length > 0) {
      values.push(messageId);
      await pool.execute(
        `UPDATE product_collab_messages SET ${fields.join(', ')} WHERE id = ? AND product_id = ?`,
        [...values, productId]
      );
    }
    if (dto.attachment_urls !== undefined) {
      await pool.execute('DELETE FROM product_collab_attachments WHERE message_id = ?', [messageId]);
      for (let i = 0; i < dto.attachment_urls.length; i++) {
        const a = dto.attachment_urls[i];
        await pool.execute(
          'INSERT INTO product_collab_attachments (message_id, kind, url, original_filename, display_order) VALUES (?, ?, ?, ?, ?)',
          [messageId, a.kind, a.url, a.original_filename ?? null, i]
        );
      }
    }
    if (fields.length === 0 && dto.attachment_urls === undefined) return null;
    await this.updateLastActivity(productId);
    const product = await this.findProductById(productId);
    const msg = product?.messages?.find((m) => m.id === messageId) ?? product?.messages?.flatMap((m) => m.replies ?? []).find((r) => r.id === messageId);
    return msg ?? null;
  }

  async updateMessageTranslation(
    messageId: number,
    productId: number,
    data: { body_translated: string; body_lang?: string | null; body_translation_provider?: 'openai' | 'qwen' | null }
  ): Promise<void> {
    await pool.execute(
      'UPDATE product_collab_messages SET body_translated = ?, body_lang = ?, body_translation_provider = ? WHERE id = ? AND product_id = ?',
      [data.body_translated, data.body_lang ?? null, data.body_translation_provider ?? null, messageId, productId]
    );
  }

  async deleteMessage(messageId: number, productId: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'DELETE FROM product_collab_messages WHERE id = ? AND product_id = ?',
      [messageId, productId]
    );
    if (res.affectedRows > 0) {
      await this.updateLastActivity(productId);
      return true;
    }
    return false;
  }

  async findMyTasks(userId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardMyTask[]; total: number }> {
    const limit = options?.limit ?? 0;
    const offset = Math.max(0, options?.offset ?? 0);
    const baseSql = `FROM product_collab_tasks t
       JOIN product_collab_products p ON p.id = t.product_id
       LEFT JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
       WHERE t.assignee_id = ? AND t.completed_at IS NULL AND p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')`;
    const [rows] = await pool.execute<RowDataPacket[]>(
      limit > 0
        ? `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id, t.assignee_id, t.completed_at, t.created_at,
              m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
        : `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id, t.assignee_id, t.completed_at, t.created_at,
              m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.created_at DESC`,
      limit > 0 ? [userId, limit, offset] : [userId]
    );
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total ${baseSql}`,
      [userId]
    );
    const total = Number((countRows as RowDataPacket[])[0]?.total ?? 0);
    const items = (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      message_id: r.message_id,
      assignee_id: r.assignee_id,
      completed_at: r.completed_at ?? null,
      created_at: r.created_at,
      body: r.body ?? null,
      body_translated: r.body_translated ?? null,
      body_lang: (r as RowDataPacket).body_lang ?? null,
    })) as DashboardMyTask[];
    return { items, total };
  }

  async completeTask(taskId: number, productId: number, assigneeId: string): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE product_collab_tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ? AND product_id = ? AND assignee_id = ?`,
      [taskId, productId, assigneeId]
    );
    return res.affectedRows > 0;
  }

  async findTeamTasks(currentUserId: string): Promise<DashboardTeamTask[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id as product_id, p.name as product_name, p.assignee_id, a.name as assignee_name, p.last_activity_at
       FROM product_collab_products p
       LEFT JOIN admin_accounts a ON p.assignee_id = a.id
       WHERE p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED') AND p.assignee_id IS NOT NULL AND p.assignee_id != ?
       ORDER BY p.last_activity_at DESC LIMIT 20`,
      [currentUserId]
    );
    return rows as DashboardTeamTask[];
  }

  async findAllAssigneeTasks(excludeUserId: string | null, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardAllAssigneeTask[]; total: number }> {
    const excludeClause = excludeUserId ? ' AND t.assignee_id != ?' : '';
    const params = excludeUserId ? [excludeUserId] : [];
    const limit = options?.limit ?? 0;
    const offset = Math.max(0, options?.offset ?? 0);
    const baseSql = `FROM product_collab_tasks t
       JOIN product_collab_products p ON p.id = t.product_id AND p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')
       LEFT JOIN admin_accounts a ON t.assignee_id = a.id
       LEFT JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
       WHERE t.completed_at IS NULL${excludeClause}`;
    const listParams = limit > 0 ? [...params, limit, offset] : params;
    const [rows] = await pool.execute<RowDataPacket[]>(
      limit > 0
        ? `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id,
              t.assignee_id, a.name as assignee_name, t.completed_at, t.created_at,
              m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
        : `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id,
              t.assignee_id, a.name as assignee_name, t.completed_at, t.created_at,
              m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.created_at DESC`,
      listParams
    );
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total ${baseSql}`,
      params
    );
    const total = Number((countRows as RowDataPacket[])[0]?.total ?? 0);
    const items = (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      message_id: r.message_id,
      assignee_id: r.assignee_id,
      assignee_name: r.assignee_name ?? null,
      completed_at: r.completed_at ?? null,
      created_at: r.created_at,
      body: r.body ?? null,
      body_translated: r.body_translated ?? null,
      body_lang: (r as RowDataPacket).body_lang ?? null,
    })) as DashboardAllAssigneeTask[];
    return { items, total };
  }

  /** AI 업무 요약용: 취소·생산완료 제외한 모든 제품 (태스크 유무와 무관) */
  async findActiveProductsForSummary(): Promise<
    { product_id: number; product_name: string; product_status: string; last_activity_at: Date }[]
  > {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id AS product_id, p.name AS product_name, p.status AS product_status, p.last_activity_at
       FROM product_collab_products p
       WHERE p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')
       ORDER BY p.id`
    );
    return (rows as RowDataPacket[]).map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_status: r.product_status,
      last_activity_at: r.last_activity_at,
    }));
  }

  /** AI 업무 요약용(레거시): 취소/완료 제외 전체 미완료 태스크 + 제품 상태·마지막 활동일 */
  async findActiveTasksWithProductInfoForSummary(): Promise<
    { task_id: number; product_id: number; product_name: string; product_status: string; last_activity_at: Date; assignee_name: string | null; body: string | null; created_at: Date }[]
  > {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id AS task_id, t.product_id, p.name AS product_name, p.status AS product_status, p.last_activity_at,
              a.name AS assignee_name, m.body, t.created_at
       FROM product_collab_tasks t
       JOIN product_collab_products p ON p.id = t.product_id AND p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')
       LEFT JOIN admin_accounts a ON t.assignee_id = a.id
       LEFT JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
       WHERE t.completed_at IS NULL
       ORDER BY p.id, t.created_at DESC`
    );
    return (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      product_status: r.product_status,
      last_activity_at: r.last_activity_at,
      assignee_name: r.assignee_name ?? null,
      body: r.body ?? null,
      created_at: r.created_at,
    }));
  }

  /** AI 업무 요약용: 제품별 쓰레드 전체 메시지 (글+댓글, created_at 오름차순) */
  async findThreadMessagesForSummary(productIds: number[]): Promise<
    { product_id: number; id: number; parent_id: number | null; author_name: string | null; body: string | null; created_at: Date }[]
  > {
    if (productIds.length === 0) return [];
    const placeholders = productIds.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT m.product_id, m.id, m.parent_id, a.name AS author_name, m.body, m.created_at
       FROM product_collab_messages m
       LEFT JOIN admin_accounts a ON m.author_id = a.id
       WHERE m.product_id IN (${placeholders})
       ORDER BY m.product_id, m.created_at ASC`,
      productIds
    );
    return (rows as RowDataPacket[]).map((r) => ({
      product_id: r.product_id,
      id: r.id,
      parent_id: r.parent_id ?? null,
      author_name: r.author_name ?? null,
      body: r.body ?? null,
      created_at: r.created_at,
    }));
  }

  /** AI 업무 요약용: 내 미완료 태스크 + 제품 상태·마지막 활동일 */
  async findMyTasksWithProductInfoForSummary(userId: string): Promise<
    { task_id: number; product_id: number; product_name: string; product_status: string; last_activity_at: Date; body: string | null; created_at: Date }[]
  > {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id AS task_id, t.product_id, p.name AS product_name, p.status AS product_status, p.last_activity_at,
              m.body, t.created_at
       FROM product_collab_tasks t
       JOIN product_collab_products p ON p.id = t.product_id AND p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')
       LEFT JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
       WHERE t.assignee_id = ? AND t.completed_at IS NULL
       ORDER BY p.id, t.created_at DESC`,
      [userId]
    );
    return (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      product_status: r.product_status,
      last_activity_at: r.last_activity_at,
      body: r.body ?? null,
      created_at: r.created_at,
    }));
  }

  /** 담당자별 최대 3건씩만 (대시보드 미리보기용) */
  async findAssigneeTasksForDashboard(excludeUserId: string | null): Promise<DashboardAllAssigneeTask[]> {
    const excludeClause = excludeUserId ? ' AND t.assignee_id != ?' : '';
    const params = excludeUserId ? [excludeUserId] : [];
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT task_id, product_id, product_name, message_id, assignee_id, assignee_name, completed_at, created_at, body, body_translated, body_lang
       FROM (
         SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id,
                t.assignee_id, a.name as assignee_name, t.completed_at, t.created_at,
                m.body, m.body_translated, m.body_lang,
                ROW_NUMBER() OVER (PARTITION BY t.assignee_id ORDER BY t.created_at DESC) AS rn
         FROM product_collab_tasks t
         JOIN product_collab_products p ON p.id = t.product_id AND p.status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED')
         LEFT JOIN admin_accounts a ON t.assignee_id = a.id
         LEFT JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
         WHERE t.completed_at IS NULL${excludeClause}
       ) sub WHERE rn <= 3
       ORDER BY created_at DESC`,
      params
    );
    return (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      message_id: r.message_id,
      assignee_id: r.assignee_id,
      assignee_name: r.assignee_name ?? null,
      completed_at: r.completed_at ?? null,
      created_at: r.created_at,
      body: r.body ?? null,
      body_translated: r.body_translated ?? null,
      body_lang: (r as RowDataPacket).body_lang ?? null,
    })) as DashboardAllAssigneeTask[];
  }

  async getStatusCounts(): Promise<DashboardStatusCount[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count FROM product_collab_products WHERE status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED') GROUP BY status`
    );
    return rows as DashboardStatusCount[];
  }

  async getProductCounts(): Promise<{ activeCount: number; archiveCount: number; cancelledCount: number }> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        SUM(CASE WHEN status NOT IN ('PRODUCTION_COMPLETE', 'CANCELLED') THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN status = 'PRODUCTION_COMPLETE' THEN 1 ELSE 0 END) AS archive_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
       FROM product_collab_products`
    );
    const r = (rows as RowDataPacket[])[0];
    return {
      activeCount: Number(r?.active_count ?? 0),
      archiveCount: Number(r?.archive_count ?? 0),
      cancelledCount: Number(r?.cancelled_count ?? 0),
    };
  }

  /** 내가 작성한 메시지를 멘션된 사람이 확인한 목록 (메시지 작성자 기준, 최근 1일만) */
  async findConfirmationsReceived(authorId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardConfirmation[]; total: number }> {
    const limit = options?.limit ?? 0;
    const offset = Math.max(0, options?.offset ?? 0);
    const baseSql = `FROM product_collab_tasks t
       JOIN product_collab_messages m ON m.id = t.message_id AND m.product_id = t.product_id
       JOIN product_collab_products p ON p.id = t.product_id
       LEFT JOIN admin_accounts a ON t.assignee_id = a.id
       WHERE m.author_id = ? AND t.completed_at IS NOT NULL
         AND t.completed_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total ${baseSql}`,
      [authorId]
    );
    const total = Number((countRows as RowDataPacket[])[0]?.total ?? 0);
    const listParams = limit > 0 ? [authorId, limit, offset] : [authorId];
    const [rows] = await pool.execute<RowDataPacket[]>(
      limit > 0
        ? `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id,
              t.assignee_id, a.name as assignee_name, t.completed_at, m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.completed_at DESC LIMIT ? OFFSET ?`
        : `SELECT t.id as task_id, t.product_id, p.name as product_name, t.message_id,
              t.assignee_id, a.name as assignee_name, t.completed_at, m.body, m.body_translated, m.body_lang
           ${baseSql} ORDER BY t.completed_at DESC LIMIT 50`,
      listParams
    );
    const items = (rows as RowDataPacket[]).map((r) => ({
      task_id: r.task_id,
      product_id: r.product_id,
      product_name: r.product_name,
      message_id: r.message_id,
      assignee_id: r.assignee_id,
      assignee_name: r.assignee_name ?? null,
      completed_at: r.completed_at,
      body: r.body ?? null,
      body_translated: (r as RowDataPacket).body_translated ?? null,
      body_lang: (r as RowDataPacket).body_lang ?? null,
    })) as DashboardConfirmation[];
    return { items, total };
  }

  /** 내가 작성한 메시지에 달린 답글 (직접+중첩, 최근 1일만, 최신순) */
  async findRepliesToMyMessages(userId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardReplyItem[]; total: number }> {
    const limit = options?.limit ?? 0;
    const offset = Math.max(0, options?.offset ?? 0);
    const cte = `WITH RECURSIVE reply_tree AS (
        SELECT m.id, m.product_id, m.parent_id, m.author_id, m.body, m.body_translated, m.body_lang, m.created_at, 1 AS depth
        FROM product_collab_messages m
        INNER JOIN product_collab_messages parent ON m.parent_id = parent.id AND parent.author_id = ?
        UNION ALL
        SELECT m.id, m.product_id, m.parent_id, m.author_id, m.body, m.body_translated, m.body_lang, m.created_at, r.depth + 1
        FROM product_collab_messages m
        INNER JOIN reply_tree r ON m.parent_id = r.id
      )`;
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `${cte}
       SELECT COUNT(*) as total FROM reply_tree r WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [userId]
    );
    const total = Number((countRows as RowDataPacket[])[0]?.total ?? 0);
    const listParams = limit > 0 ? [userId, limit, offset] : [userId];
    const [rows] = await pool.execute<RowDataPacket[]>(
      limit > 0
        ? `${cte}
           SELECT r.id AS message_id, r.product_id, p.name AS product_name, r.parent_id, r.author_id,
                  a.name AS author_name, r.body, r.body_translated, r.body_lang, r.created_at, r.depth
           FROM reply_tree r
           JOIN product_collab_products p ON p.id = r.product_id
           LEFT JOIN admin_accounts a ON a.id = r.author_id
           WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
           ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
        : `${cte}
           SELECT r.id AS message_id, r.product_id, p.name AS product_name, r.parent_id, r.author_id,
                  a.name AS author_name, r.body, r.body_translated, r.body_lang, r.created_at, r.depth
           FROM reply_tree r
           JOIN product_collab_products p ON p.id = r.product_id
           LEFT JOIN admin_accounts a ON a.id = r.author_id
           WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
           ORDER BY r.created_at DESC LIMIT 100`,
      listParams
    );
    const items = (rows as RowDataPacket[]).map((r) => ({
      message_id: r.message_id,
      product_id: r.product_id,
      product_name: r.product_name,
      parent_id: r.parent_id,
      author_id: r.author_id,
      author_name: r.author_name ?? null,
      body: r.body ?? null,
      body_translated: (r as RowDataPacket).body_translated ?? null,
      body_lang: (r as RowDataPacket).body_lang ?? null,
      created_at: r.created_at,
      depth: Number(r.depth) || 1,
    })) as DashboardReplyItem[];
    return { items, total };
  }

  async createProductImage(
    productId: number,
    imageUrl: string,
    kind: 'candidate' | 'final',
    createdBy: string | null
  ): Promise<ProductCollabProductImage> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_collab_product_images (product_id, image_url, kind, display_order, created_by)
       VALUES (?, ?, ?, 0, ?)`,
      [productId, imageUrl, kind, createdBy]
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_collab_product_images WHERE id = ?',
      [res.insertId]
    );
    const r = rows[0];
    return {
      id: r.id,
      product_id: r.product_id,
      image_url: r.image_url,
      kind: r.kind,
      display_order: r.display_order,
      created_at: r.created_at,
      created_by: r.created_by,
    };
  }

  async setProductMainImage(productId: number, imageId: number): Promise<void> {
    await pool.execute(
      'UPDATE product_collab_products SET main_image_id = ? WHERE id = ?',
      [imageId, productId]
    );
    await pool.execute(
      "UPDATE product_collab_product_images SET kind = 'candidate' WHERE product_id = ?",
      [productId]
    );
    await pool.execute(
      "UPDATE product_collab_product_images SET kind = 'final' WHERE id = ?",
      [imageId]
    );
  }

  async deleteProductImage(productId: number, imageId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM product_collab_product_images WHERE id = ? AND product_id = ?',
      [imageId, productId]
    );
    if (rows.length === 0) return false;
    await pool.execute('DELETE FROM product_collab_product_images WHERE id = ? AND product_id = ?', [
      imageId,
      productId,
    ]);
    return true;
  }

  /** 제품(및 CASCADE된 메시지·태스크·이미지·첨부·멘션) 삭제. 진행중/취소만 허용할지 여부는 서비스에서 검사. */
  async deleteProduct(id: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      'DELETE FROM product_collab_products WHERE id = ?',
      [id]
    );
    return res.affectedRows > 0;
  }

  /** 제품 스레드의 메시지·답글 중 최대 created_at (없으면 null) */
  async getMaxMessageCreatedAtForProduct(productId: number): Promise<Date | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT MAX(created_at) AS mx FROM product_collab_messages WHERE product_id = ?',
      [productId]
    );
    const mx = (rows as RowDataPacket[])[0]?.mx;
    if (mx == null) return null;
    return mx instanceof Date ? mx : new Date(mx as string);
  }

  /** 스레드 조회(읽음) 커서 저장 — 이 시각 이하의 타인 메시지는 미확인에서 제외 */
  async upsertThreadView(userId: string, productId: number, lastSeenMessageCreatedAt: Date): Promise<void> {
    await pool.execute(
      `INSERT INTO product_collab_thread_views (user_id, product_id, last_seen_message_created_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen_message_created_at = VALUES(last_seen_message_created_at)`,
      [userId, productId, lastSeenMessageCreatedAt]
    );
  }

  /**
   * 전 제품 합산: 타인이 작성한 메시지·답글 중, 해당 제품 스레드 페이지를 아직 열지 않았거나
   * 열었던 시점의 커서보다 이후에 생성된 행만 카운트.
   */
  async countUnreadThreadMessagesForUser(userId: string): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt
       FROM product_collab_messages m
       JOIN product_collab_products p ON p.id = m.product_id
       LEFT JOIN product_collab_thread_views v
         ON v.product_id = m.product_id AND v.user_id = ?
       WHERE m.author_id <> ?
         AND m.created_at >= ?
         AND (
           v.last_seen_message_created_at IS NULL
           OR m.created_at > v.last_seen_message_created_at
         )`,
      [userId, userId, PRODUCT_COLLAB_THREAD_UNREAD_SINCE]
    );
    return Number((rows as RowDataPacket[])[0]?.cnt ?? 0);
  }

  /** 미확인 메시지·답글 목록 (집계와 동일 조건, 최신순) */
  async findUnreadThreadMessagesForUser(userId: string, limit: number): Promise<
    {
      message_id: number;
      product_id: number;
      product_name: string;
      parent_id: number | null;
      author_id: string;
      author_name: string | null;
      body: string | null;
      created_at: Date;
    }[]
  > {
    const lim = Math.min(Math.max(1, limit), 500);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT m.id AS message_id, m.product_id, m.parent_id, m.author_id, m.body, m.created_at,
              p.name AS product_name, a.name AS author_name
       FROM product_collab_messages m
       JOIN product_collab_products p ON p.id = m.product_id
       LEFT JOIN admin_accounts a ON a.id = m.author_id
       LEFT JOIN product_collab_thread_views v
         ON v.product_id = m.product_id AND v.user_id = ?
       WHERE m.author_id <> ?
         AND m.created_at >= ?
         AND (
           v.last_seen_message_created_at IS NULL
           OR m.created_at > v.last_seen_message_created_at
         )
       ORDER BY m.created_at DESC
       LIMIT ${lim}`,
      [userId, userId, PRODUCT_COLLAB_THREAD_UNREAD_SINCE]
    );
    return (rows as RowDataPacket[]).map((r) => ({
      message_id: Number(r.message_id),
      product_id: Number(r.product_id),
      product_name: String(r.product_name ?? ''),
      parent_id: r.parent_id != null ? Number(r.parent_id) : null,
      author_id: String(r.author_id ?? ''),
      author_name: r.author_name != null ? String(r.author_name) : null,
      body: r.body != null ? String(r.body) : null,
      created_at: r.created_at instanceof Date ? r.created_at : new Date(r.created_at as string),
    }));
  }
}
