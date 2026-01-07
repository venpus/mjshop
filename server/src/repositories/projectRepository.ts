import { pool } from '../config/database.js';
import {
  Project,
  ProjectEntry,
  ProjectEntryImage,
  ProjectEntryImageReaction,
  ProjectEntryComment,
  ProjectEntryCommentReply,
  ProjectPublic,
  ProjectEntryPublic,
  ProjectEntryImagePublic,
  ProjectEntryCommentPublic,
  ProjectInitialImage,
  ProjectReferenceLink,
  ProjectView,
  ProjectListItem,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateProjectEntryDTO,
  UpdateProjectEntryDTO,
  UpsertImageReactionDTO,
  CreateCommentDTO,
  CreateCommentReplyDTO,
  CreateProjectInitialImageDTO,
  CreateProjectReferenceLinkDTO,
  UpdateProjectReferenceLinkDTO,
  CreateProjectViewDTO,
} from '../models/project.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ProjectRow extends RowDataPacket {
  id: number;
  name: string;
  status: string;
  start_date: Date;
  requirements: string | null;
  last_entry_content: string | null;
  confirmed_image_url: string | null;
  thumbnail_image_url: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProjectEntryRow extends RowDataPacket {
  id: number;
  project_id: number;
  date: Date;
  title: string;
  content: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProjectEntryImageRow extends RowDataPacket {
  id: number;
  entry_id: number;
  image_url: string;
  display_order: number;
  description: string | null;
  is_confirmed: boolean;
  confirmed_at: Date | null;
  created_at: Date;
}

interface ProjectInitialImageRow extends RowDataPacket {
  id: number;
  project_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

interface ProjectReferenceLinkRow extends RowDataPacket {
  id: number;
  project_id: number;
  title: string | null;
  url: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

interface ProjectViewRow extends RowDataPacket {
  id: number;
  project_id: number;
  user_id: string;
  viewed_at: Date;
}

interface ProjectListItemRow extends RowDataPacket {
  id: number;
  name: string;
  status: string;
  start_date: Date;
  requirements: string | null;
  thumbnail_image_url: string | null;
  confirmed_image_url: string | null;
  last_entry_content: string | null;
  last_entry_date: Date | null;
  last_entry_author_id: string | null;
  last_entry_author_name: string | null;
  last_comment_content: string | null;
  last_comment_author_id: string | null;
  last_comment_author_name: string | null;
  last_comment_date: Date | null;
  creator_name: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ProjectEntryImageReactionRow extends RowDataPacket {
  id: number;
  image_id: number;
  user_id: string;
  reaction: string;
  created_at: Date;
  updated_at: Date;
}

interface ProjectEntryCommentRow extends RowDataPacket {
  id: number;
  entry_id: number;
  content: string;
  user_id: string;
  user_name: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ProjectEntryCommentReplyRow extends RowDataPacket {
  id: number;
  comment_id: number;
  content: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export class ProjectRepository {
  /**
   * 모든 프로젝트 조회 (목록용 - 최적화)
   */
  async findAllForList(): Promise<ProjectListItem[]> {
    const [rows] = await pool.execute<ProjectListItemRow[]>(
      `SELECT 
        p.id,
        p.name,
        p.status,
        p.start_date,
        p.requirements,
        COALESCE(
          p.confirmed_image_url,
          (
            SELECT pei.image_url 
            FROM project_entry_images pei
            INNER JOIN project_entries pe ON pei.entry_id = pe.id
            WHERE pe.project_id = p.id
            ORDER BY pei.created_at DESC
            LIMIT 1
          ),
          p.thumbnail_image_url
        ) as thumbnail_image_url,
        p.confirmed_image_url,
        p.last_entry_content,
        p.last_entry_date,
        p.last_entry_author_id,
        p.last_entry_author_name,
        p.last_comment_content,
        p.last_comment_author_id,
        p.last_comment_author_name,
        p.last_comment_date,
        a.name as creator_name,
        p.created_by,
        p.created_at,
        p.updated_at
       FROM projects p
       LEFT JOIN admin_accounts a ON p.created_by = a.id
       ORDER BY p.created_at DESC`
    );

    return rows.map(this.mapRowToProjectListItem);
  }

  /**
   * 프로젝트 목록 조회 (페이지네이션 지원)
   */
  async findForListPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: ProjectListItem[]; total: number }> {
    const { page, limit, search, status, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    // WHERE 조건 구성
    const conditions: string[] = [];
    const values: any[] = [];

    // 검색어 조건
    if (search && search.trim()) {
      conditions.push(`(
        p.name LIKE ? OR
        p.requirements LIKE ? OR
        p.last_entry_content LIKE ? OR
        p.last_comment_content LIKE ? OR
        a.name LIKE ?
      )`);
      const searchPattern = `%${search.trim()}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 상태 필터
    if (status && status !== '전체') {
      conditions.push('p.status = ?');
      values.push(status);
    }

    // 날짜 필터
    if (startDate) {
      conditions.push('DATE(p.start_date) >= ?');
      values.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(p.start_date) <= ?');
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 총 개수 조회
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM projects p
       LEFT JOIN admin_accounts a ON p.created_by = a.id
       ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    // 데이터 조회
    const [rows] = await pool.execute<ProjectListItemRow[]>(
      `SELECT 
        p.id,
        p.name,
        p.status,
        p.start_date,
        p.requirements,
        COALESCE(
          p.confirmed_image_url,
          (
            SELECT pei.image_url 
            FROM project_entry_images pei
            INNER JOIN project_entries pe ON pei.entry_id = pe.id
            WHERE pe.project_id = p.id
            ORDER BY pei.created_at DESC
            LIMIT 1
          ),
          p.thumbnail_image_url
        ) as thumbnail_image_url,
        p.confirmed_image_url,
        p.last_entry_content,
        p.last_entry_date,
        p.last_entry_author_id,
        p.last_entry_author_name,
        p.last_comment_content,
        p.last_comment_author_id,
        p.last_comment_author_name,
        p.last_comment_date,
        a.name as creator_name,
        p.created_by,
        p.created_at,
        p.updated_at
       FROM projects p
       LEFT JOIN admin_accounts a ON p.created_by = a.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return {
      items: rows.map(this.mapRowToProjectListItem),
      total,
    };
  }

  /**
   * 모든 프로젝트 조회 (기존 메서드 - 호환성 유지)
   */
  async findAll(): Promise<Project[]> {
    const [rows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, requirements, last_entry_content, 
              confirmed_image_url, thumbnail_image_url, created_at, updated_at, 
              created_by, updated_by
       FROM projects
       ORDER BY created_at DESC`
    );

    return rows.map(this.mapRowToProject);
  }

  /**
   * ID로 프로젝트 조회 (항목, 이미지, 댓글 포함)
   */
  async findById(id: number): Promise<ProjectPublic | null> {
    // 프로젝트 기본 정보 조회
    const [projectRows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, requirements, last_entry_content, 
              confirmed_image_url, thumbnail_image_url, created_at, updated_at, 
              created_by, updated_by
       FROM projects
       WHERE id = ?`,
      [id]
    );

    if (projectRows.length === 0) {
      return null;
    }

    const project = this.mapRowToProject(projectRows[0]);

    // 항목 조회 (날짜 역순)
    const [entryRows] = await pool.execute<ProjectEntryRow[]>(
      `SELECT id, project_id, date, title, content, created_at, updated_at, created_by, updated_by
       FROM project_entries
       WHERE project_id = ?
       ORDER BY date DESC, created_at DESC`,
      [id]
    );

    const entries: ProjectEntryPublic[] = [];

      for (const entryRow of entryRows) {
        const entryBase = this.mapRowToProjectEntry(entryRow);

      // 이미지 조회
      const [imageRows] = await pool.execute<ProjectEntryImageRow[]>(
        `SELECT id, entry_id, image_url, display_order, description, is_confirmed, confirmed_at, created_at
         FROM project_entry_images
         WHERE entry_id = ?
         ORDER BY display_order ASC, created_at ASC`,
        [entryBase.id]
      );

      const images: ProjectEntryImagePublic[] = [];

      for (const imageRow of imageRows) {
        const image = this.mapRowToProjectEntryImage(imageRow);

        // 이미지 반응 조회 (현재는 가장 최근 반응만, 필요시 사용자별로 변경 가능)
        const [reactionRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
          `SELECT id, image_id, user_id, reaction, created_at, updated_at
           FROM project_entry_image_reactions
           WHERE image_id = ?
           ORDER BY updated_at DESC
           LIMIT 1`,
          [image.id]
        );

        const imagePublic: ProjectEntryImagePublic = {
          ...image,
          reactions: reactionRows.map(this.mapRowToProjectEntryImageReaction),
        };

        images.push(imagePublic);
      }

      // 댓글 조회 (최신순)
      const [commentRows] = await pool.execute<ProjectEntryCommentRow[]>(
        `SELECT 
          cec.id, 
          cec.entry_id, 
          cec.content, 
          cec.user_id, 
          a.name as user_name,
          cec.created_at, 
          cec.updated_at
         FROM project_entry_comments cec
         LEFT JOIN admin_accounts a ON cec.user_id = a.id
         WHERE cec.entry_id = ?
         ORDER BY cec.created_at ASC`,
        [entryBase.id]
      );

      const comments: ProjectEntryCommentPublic[] = [];

      for (const commentRow of commentRows) {
        const commentBase = this.mapRowToProjectEntryComment(commentRow);

        // 답글 조회
        const [replyRows] = await pool.execute<ProjectEntryCommentReplyRow[]>(
          `SELECT 
            r.id, 
            r.comment_id, 
            r.content, 
            r.user_id, 
            a.name as user_name,
            r.created_at, 
            r.updated_at
           FROM project_entry_comment_replies r
           LEFT JOIN admin_accounts a ON r.user_id = a.id
           WHERE r.comment_id = ?
           ORDER BY r.created_at ASC`,
          [commentBase.id]
        );

        const commentPublic: ProjectEntryCommentPublic = {
          ...commentBase,
          replies: replyRows.map(this.mapRowToProjectEntryCommentReply),
        };

        comments.push(commentPublic);
      }

      const entry: ProjectEntryPublic = {
        ...entryBase,
        images,
        comments,
      };

      entries.push(entry);
    }

    // 초기 이미지 조회
    const [initialImageRows] = await pool.execute<ProjectInitialImageRow[]>(
      `SELECT id, project_id, image_url, display_order, created_at
       FROM project_initial_images
       WHERE project_id = ?
       ORDER BY display_order ASC, created_at ASC`,
      [id]
    );

    const initialImages = initialImageRows.map(this.mapRowToProjectInitialImage);

    // 참고 링크 조회
    const [linkRows] = await pool.execute<ProjectReferenceLinkRow[]>(
      `SELECT id, project_id, title, url, display_order, created_at, updated_at
       FROM project_reference_links
       WHERE project_id = ?
       ORDER BY display_order ASC, created_at ASC`,
      [id]
    );

    const referenceLinks = linkRows.map(this.mapRowToProjectReferenceLink);

    // 작성자 이름 조회
    let creatorName: string | null = null;
    if (project.created_by) {
      const [userRows] = await pool.execute<RowDataPacket[]>(
        `SELECT name FROM admin_accounts WHERE id = ?`,
        [project.created_by]
      );
      if (userRows.length > 0) {
        creatorName = userRows[0].name;
      }
    }

    // 최근 조회자 조회 (최근 10명)
    const [viewRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT pv.user_id, a.name as user_name, MAX(pv.viewed_at) as viewed_at
       FROM project_views pv
       LEFT JOIN admin_accounts a ON pv.user_id = a.id
       WHERE pv.project_id = ?
       GROUP BY pv.user_id, a.name
       ORDER BY viewed_at DESC
       LIMIT 10`,
      [id]
    );

    const recentViewers = viewRows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      viewed_at: row.viewed_at,
    }));

    return {
      ...project,
      entries,
      initial_images: initialImages,
      reference_links: referenceLinks,
      creator_name: creatorName,
      recent_viewers: recentViewers,
    };
  }

  /**
   * 프로젝트 생성
   */
  async create(data: CreateProjectDTO): Promise<Project> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO projects (name, status, start_date, requirements, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.name,
        data.status || '진행중',
        data.start_date,
        data.requirements || null,
        data.created_by || null,
      ]
    );

    const project = await this.findByIdWithoutRelations(result.insertId);
    if (!project) {
      throw new Error('프로젝트 생성 후 조회에 실패했습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 수정
   */
  async update(id: number, data: UpdateProjectDTO): Promise<Project> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(data.start_date);
    }
    if (data.requirements !== undefined) {
      updates.push('requirements = ?');
      values.push(data.requirements);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      const project = await this.findByIdWithoutRelations(id);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }
      return project;
    }

    values.push(id);

    await pool.execute(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const project = await this.findByIdWithoutRelations(id);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 삭제
   */
  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
  }

  /**
   * 프로젝트 항목 생성
   */
  async createEntry(data: CreateProjectEntryDTO): Promise<ProjectEntry> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entries (project_id, date, title, content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.project_id,
        data.date,
        data.title,
        data.content || null,
        data.created_by || null,
      ]
    );

    const entry = await this.findEntryById(result.insertId);
    if (!entry) {
      throw new Error('프로젝트 항목 생성 후 조회에 실패했습니다.');
    }

    return entry;
  }

  /**
   * 프로젝트 항목 수정
   */
  async updateEntry(id: number, data: UpdateProjectEntryDTO): Promise<ProjectEntry> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      const entry = await this.findEntryById(id);
      if (!entry) {
        throw new Error('프로젝트 항목을 찾을 수 없습니다.');
      }
      return entry;
    }

    values.push(id);

    await pool.execute(
      `UPDATE project_entries SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const entry = await this.findEntryById(id);
    if (!entry) {
      throw new Error('프로젝트 항목을 찾을 수 없습니다.');
    }

    return entry;
  }

  /**
   * 프로젝트 항목 삭제
   */
  async deleteEntry(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entries WHERE id = ?', [id]);
  }

  /**
   * 프로젝트 항목 이미지 추가
   */
  async createEntryImage(entryId: number, imageUrl: string, displayOrder: number): Promise<ProjectEntryImage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_images (entry_id, image_url, display_order)
       VALUES (?, ?, ?)`,
      [entryId, imageUrl, displayOrder]
    );

    const [rows] = await pool.execute<ProjectEntryImageRow[]>(
      `SELECT id, entry_id, image_url, display_order, description, is_confirmed, confirmed_at, created_at
       FROM project_entry_images
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('이미지 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryImage(rows[0]);
  }

  /**
   * 프로젝트 항목 이미지 삭제
   */
  async deleteEntryImage(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_images WHERE id = ?', [id]);
  }

  /**
   * 이미지 반응 생성/수정
   */
  async upsertImageReaction(data: UpsertImageReactionDTO): Promise<ProjectEntryImageReaction> {
    // 기존 반응 확인
    const [existingRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
      `SELECT id, image_id, user_id, reaction, created_at, updated_at
       FROM project_entry_image_reactions
       WHERE image_id = ? AND user_id = ?`,
      [data.image_id, data.user_id]
    );

    if (existingRows.length > 0) {
      // 기존 반응 수정
      await pool.execute(
        `UPDATE project_entry_image_reactions 
         SET reaction = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.reaction, existingRows[0].id]
      );

      const [updatedRows] = await pool.execute<ProjectEntryImageReactionRow[]>(
        `SELECT id, image_id, user_id, reaction, created_at, updated_at
         FROM project_entry_image_reactions
         WHERE id = ?`,
        [existingRows[0].id]
      );

      if (updatedRows.length === 0) {
        throw new Error('반응 수정 후 조회에 실패했습니다.');
      }

      return this.mapRowToProjectEntryImageReaction(updatedRows[0]);
    } else {
      // 새 반응 생성
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO project_entry_image_reactions (image_id, user_id, reaction)
         VALUES (?, ?, ?)`,
        [data.image_id, data.user_id, data.reaction]
      );

      const [rows] = await pool.execute<ProjectEntryImageReactionRow[]>(
        `SELECT id, image_id, user_id, reaction, created_at, updated_at
         FROM project_entry_image_reactions
         WHERE id = ?`,
        [result.insertId]
      );

      if (rows.length === 0) {
        throw new Error('반응 생성 후 조회에 실패했습니다.');
      }

      return this.mapRowToProjectEntryImageReaction(rows[0]);
    }
  }

  /**
   * 이미지 반응 삭제
   */
  async deleteImageReaction(imageId: number, userId: string): Promise<void> {
    await pool.execute(
      'DELETE FROM project_entry_image_reactions WHERE image_id = ? AND user_id = ?',
      [imageId, userId]
    );
  }

  /**
   * 댓글 생성
   */
  async createComment(data: CreateCommentDTO): Promise<ProjectEntryComment> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_comments (entry_id, content, user_id)
       VALUES (?, ?, ?)`,
      [data.entry_id, data.content, data.user_id]
    );

    const [rows] = await pool.execute<ProjectEntryCommentRow[]>(
      `SELECT id, entry_id, content, user_id, created_at, updated_at
       FROM project_entry_comments
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('댓글 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryComment(rows[0]);
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_comments WHERE id = ?', [id]);
  }

  /**
   * 답글 생성
   */
  async createCommentReply(data: CreateCommentReplyDTO): Promise<ProjectEntryCommentReply> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_entry_comment_replies (comment_id, content, user_id)
       VALUES (?, ?, ?)`,
      [data.comment_id, data.content, data.user_id]
    );

    const [rows] = await pool.execute<ProjectEntryCommentReplyRow[]>(
      `SELECT id, comment_id, content, user_id, created_at, updated_at
       FROM project_entry_comment_replies
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('답글 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectEntryCommentReply(rows[0]);
  }

  /**
   * 답글 삭제
   */
  async deleteCommentReply(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_entry_comment_replies WHERE id = ?', [id]);
  }

  /**
   * 댓글 ID로 항목 ID 조회
   */
  async findEntryIdByCommentId(commentId: number): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT entry_id FROM project_entry_comments WHERE id = ?',
      [commentId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].entry_id;
  }

  /**
   * 답글 ID로 항목 ID 조회
   */
  async findEntryIdByReplyId(replyId: number): Promise<number | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ce.entry_id 
       FROM project_entry_comment_replies r
       JOIN project_entry_comments ce ON r.comment_id = ce.id
       WHERE r.id = ?`,
      [replyId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].entry_id;
  }

  /**
   * Helper: ID로 프로젝트 조회 (관계 제외)
   */
  private async findByIdWithoutRelations(id: number): Promise<Project | null> {
    const [rows] = await pool.execute<ProjectRow[]>(
      `SELECT id, name, status, start_date, requirements, last_entry_content, 
              confirmed_image_url, thumbnail_image_url, created_at, updated_at, 
              created_by, updated_by
       FROM projects
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProject(rows[0]);
  }

  /**
   * Helper: ID로 항목 조회
   */
  /**
   * 항목 이미지 ID로 조회
   */
  async findEntryImageById(imageId: number): Promise<ProjectEntryImage | null> {
    const [rows] = await pool.execute<ProjectEntryImageRow[]>(
      `SELECT id, entry_id, image_url, display_order, description, is_confirmed, confirmed_at, created_at
       FROM project_entry_images
       WHERE id = ?`,
      [imageId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProjectEntryImage(rows[0]);
  }

  private async findEntryById(id: number): Promise<ProjectEntry | null> {
    const [rows] = await pool.execute<ProjectEntryRow[]>(
      `SELECT id, project_id, date, title, content, created_at, updated_at, created_by, updated_by
       FROM project_entries
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProjectEntry(rows[0]);
  }

  /**
   * Helper: Row to Project 매핑
   */
  private mapRowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      status: row.status as any,
      start_date: row.start_date,
      requirements: row.requirements,
      last_entry_content: row.last_entry_content,
      confirmed_image_url: row.confirmed_image_url,
      thumbnail_image_url: row.thumbnail_image_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  /**
   * Helper: Row to ProjectListItem 매핑
   */
  private mapRowToProjectListItem(row: ProjectListItemRow): ProjectListItem {
    return {
      id: row.id,
      name: row.name,
      status: row.status as any,
      start_date: row.start_date,
      requirements: row.requirements,
      thumbnail_image_url: row.thumbnail_image_url,
      confirmed_image_url: row.confirmed_image_url,
      last_entry_content: row.last_entry_content,
      last_entry_date: row.last_entry_date,
      last_entry_author_id: row.last_entry_author_id,
      last_entry_author_name: row.last_entry_author_name,
      last_comment_content: row.last_comment_content,
      last_comment_author_id: row.last_comment_author_id,
      last_comment_author_name: row.last_comment_author_name,
      last_comment_date: row.last_comment_date,
      creator_name: row.creator_name,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntry 매핑
   */
  private mapRowToProjectEntry(row: ProjectEntryRow): ProjectEntry {
    return {
      id: row.id,
      project_id: row.project_id,
      date: row.date,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  /**
   * Helper: Row to ProjectEntryImage 매핑
   */
  private mapRowToProjectEntryImage(row: ProjectEntryImageRow): ProjectEntryImage {
    return {
      id: row.id,
      entry_id: row.entry_id,
      image_url: row.image_url,
      display_order: row.display_order,
      description: row.description,
      is_confirmed: row.is_confirmed,
      confirmed_at: row.confirmed_at,
      created_at: row.created_at,
    };
  }

  /**
   * Helper: Row to ProjectInitialImage 매핑
   */
  private mapRowToProjectInitialImage(row: ProjectInitialImageRow): ProjectInitialImage {
    return {
      id: row.id,
      project_id: row.project_id,
      image_url: row.image_url,
      display_order: row.display_order,
      created_at: row.created_at,
    };
  }

  /**
   * Helper: Row to ProjectReferenceLink 매핑
   */
  private mapRowToProjectReferenceLink(row: ProjectReferenceLinkRow): ProjectReferenceLink {
    return {
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      url: row.url,
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryImageReaction 매핑
   */
  private mapRowToProjectEntryImageReaction(row: ProjectEntryImageReactionRow): ProjectEntryImageReaction {
    return {
      id: row.id,
      image_id: row.image_id,
      user_id: row.user_id,
      reaction: row.reaction as any,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryComment 매핑
   */
  private mapRowToProjectEntryComment(row: ProjectEntryCommentRow): ProjectEntryComment {
    return {
      id: row.id,
      entry_id: row.entry_id,
      content: row.content,
      user_id: row.user_id,
      user_name: row.user_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper: Row to ProjectEntryCommentReply 매핑
   */
  private mapRowToProjectEntryCommentReply(row: ProjectEntryCommentReplyRow): ProjectEntryCommentReply {
    return {
      id: row.id,
      comment_id: row.comment_id,
      content: row.content,
      user_id: row.user_id,
      user_name: row.user_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // ==================== 초기 이미지 관련 메서드 ====================

  /**
   * 프로젝트 초기 이미지 생성
   */
  async createInitialImage(data: CreateProjectInitialImageDTO): Promise<ProjectInitialImage> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_initial_images (project_id, image_url, display_order)
       VALUES (?, ?, ?)`,
      [data.project_id, data.image_url, data.display_order]
    );

    const [rows] = await pool.execute<ProjectInitialImageRow[]>(
      `SELECT id, project_id, image_url, display_order, created_at
       FROM project_initial_images
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('초기 이미지 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectInitialImage(rows[0]);
  }

  /**
   * 프로젝트 초기 이미지 삭제
   */
  async deleteInitialImage(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_initial_images WHERE id = ?', [id]);
  }

  /**
   * 프로젝트의 모든 초기 이미지 삭제
   */
  async deleteAllInitialImages(projectId: number): Promise<void> {
    await pool.execute('DELETE FROM project_initial_images WHERE project_id = ?', [projectId]);
  }

  // ==================== 참고 링크 관련 메서드 ====================

  /**
   * 프로젝트 참고 링크 생성
   */
  async createReferenceLink(data: CreateProjectReferenceLinkDTO): Promise<ProjectReferenceLink> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO project_reference_links (project_id, title, url, display_order)
       VALUES (?, ?, ?, ?)`,
      [data.project_id, data.title || null, data.url, data.display_order]
    );

    const [rows] = await pool.execute<ProjectReferenceLinkRow[]>(
      `SELECT id, project_id, title, url, display_order, created_at, updated_at
       FROM project_reference_links
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('참고 링크 생성 후 조회에 실패했습니다.');
    }

    return this.mapRowToProjectReferenceLink(rows[0]);
  }

  /**
   * 프로젝트 참고 링크 수정
   */
  async updateReferenceLink(id: number, data: UpdateProjectReferenceLinkDTO): Promise<ProjectReferenceLink> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(data.url);
    }
    if (data.display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(data.display_order);
    }

    if (updates.length === 0) {
      const [rows] = await pool.execute<ProjectReferenceLinkRow[]>(
        `SELECT id, project_id, title, url, display_order, created_at, updated_at
         FROM project_reference_links
         WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        throw new Error('참고 링크를 찾을 수 없습니다.');
      }
      return this.mapRowToProjectReferenceLink(rows[0]);
    }

    values.push(id);

    await pool.execute(
      `UPDATE project_reference_links SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute<ProjectReferenceLinkRow[]>(
      `SELECT id, project_id, title, url, display_order, created_at, updated_at
       FROM project_reference_links
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error('참고 링크를 찾을 수 없습니다.');
    }

    return this.mapRowToProjectReferenceLink(rows[0]);
  }

  /**
   * 프로젝트 참고 링크 삭제
   */
  async deleteReferenceLink(id: number): Promise<void> {
    await pool.execute('DELETE FROM project_reference_links WHERE id = ?', [id]);
  }

  // ==================== 조회 이력 관련 메서드 ====================

  /**
   * 프로젝트 조회 이력 생성 (중복 방지: 5분 이내면 업데이트)
   */
  async upsertProjectView(data: CreateProjectViewDTO): Promise<void> {
    // 최근 조회 이력 확인 (5분 이내)
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM project_views
       WHERE project_id = ? AND user_id = ?
       AND viewed_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       ORDER BY viewed_at DESC
       LIMIT 1`,
      [data.project_id, data.user_id]
    );

    if (existingRows.length > 0) {
      // 기존 조회 이력 업데이트
      await pool.execute(
        `UPDATE project_views SET viewed_at = NOW() WHERE id = ?`,
        [existingRows[0].id]
      );
    } else {
      // 새 조회 이력 생성
      await pool.execute(
        `INSERT INTO project_views (project_id, user_id) VALUES (?, ?)`,
        [data.project_id, data.user_id]
      );
    }
  }

  // ==================== 이미지 확정 관련 메서드 ====================

  /**
   * 이미지 확정
   */
  async confirmImage(imageId: number, projectId: number): Promise<void> {
    // 이미지 확정 처리
    await pool.execute(
      `UPDATE project_entry_images 
       SET is_confirmed = TRUE, confirmed_at = NOW() 
       WHERE id = ?`,
      [imageId]
    );

    // 프로젝트의 confirmed_image_url 업데이트 (가장 최신 확정 이미지)
    const [confirmedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT image_url FROM project_entry_images
       WHERE is_confirmed = TRUE
       AND entry_id IN (SELECT id FROM project_entries WHERE project_id = ?)
       ORDER BY confirmed_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (confirmedRows.length > 0) {
      await pool.execute(
        `UPDATE projects SET confirmed_image_url = ? WHERE id = ?`,
        [confirmedRows[0].image_url, projectId]
      );
    }
  }

  /**
   * 이미지 확정 해제
   */
  async unconfirmImage(imageId: number, projectId: number): Promise<void> {
    // 이미지 확정 해제
    await pool.execute(
      `UPDATE project_entry_images 
       SET is_confirmed = FALSE, confirmed_at = NULL 
       WHERE id = ?`,
      [imageId]
    );

    // 프로젝트의 confirmed_image_url 업데이트 (가장 최신 확정 이미지 또는 NULL)
    const [confirmedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT image_url FROM project_entry_images
       WHERE is_confirmed = TRUE
       AND entry_id IN (SELECT id FROM project_entries WHERE project_id = ?)
       ORDER BY confirmed_at DESC
       LIMIT 1`,
      [projectId]
    );

    const confirmedImageUrl = confirmedRows.length > 0 ? confirmedRows[0].image_url : null;
    await pool.execute(
      `UPDATE projects SET confirmed_image_url = ? WHERE id = ?`,
      [confirmedImageUrl, projectId]
    );
  }

  /**
   * 프로젝트의 최종 항목 내용 업데이트
   */
  async updateLastEntryContent(projectId: number, content: string | null): Promise<void> {
    await pool.execute(
      `UPDATE projects SET last_entry_content = ? WHERE id = ?`,
      [content, projectId]
    );
  }

  /**
   * 프로젝트의 최종 항목 정보 업데이트 (통합)
   */
  async updateLastEntryInfo(projectId: number): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        pe.date,
        pe.content,
        pe.created_by,
        a.name as author_name
       FROM project_entries pe
       LEFT JOIN admin_accounts a ON pe.created_by = a.id
       WHERE pe.project_id = ?
       ORDER BY pe.date DESC, pe.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (rows.length > 0) {
      await pool.execute(
        `UPDATE projects SET 
         last_entry_content = ?,
         last_entry_date = ?,
         last_entry_author_id = ?,
         last_entry_author_name = ?
         WHERE id = ?`,
        [
          rows[0].content,
          rows[0].date,
          rows[0].created_by,
          rows[0].author_name || '관리자',
          projectId
        ]
      );
    } else {
      // 항목이 없으면 캐시 초기화
      await pool.execute(
        `UPDATE projects SET 
         last_entry_content = NULL,
         last_entry_date = NULL,
         last_entry_author_id = NULL,
         last_entry_author_name = NULL
         WHERE id = ?`,
        [projectId]
      );
    }
  }

  /**
   * 프로젝트의 최신 댓글 정보 업데이트
   */
  async updateLastCommentInfo(projectId: number): Promise<void> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        cec.content,
        cec.user_id,
        cec.created_at,
        a.name as author_name
       FROM project_entry_comments cec
       INNER JOIN project_entries pe ON cec.entry_id = pe.id
       LEFT JOIN admin_accounts a ON cec.user_id = a.id
       WHERE pe.project_id = ?
       ORDER BY pe.date DESC, pe.created_at DESC, cec.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (rows.length > 0) {
      await pool.execute(
        `UPDATE projects SET 
         last_comment_content = ?,
         last_comment_author_id = ?,
         last_comment_author_name = ?,
         last_comment_date = ?
         WHERE id = ?`,
        [
          rows[0].content,
          rows[0].user_id,
          rows[0].author_name || '관리자',
          rows[0].created_at,
          projectId
        ]
      );
    } else {
      // 댓글이 없으면 캐시 초기화
      await pool.execute(
        `UPDATE projects SET 
         last_comment_content = NULL,
         last_comment_author_id = NULL,
         last_comment_author_name = NULL,
         last_comment_date = NULL
         WHERE id = ?`,
        [projectId]
      );
    }
  }

  /**
   * 프로젝트의 썸네일 이미지 업데이트
   */
  async updateThumbnailImage(projectId: number, imageUrl: string | null): Promise<void> {
    await pool.execute(
      `UPDATE projects SET thumbnail_image_url = ? WHERE id = ?`,
      [imageUrl, projectId]
    );
  }

  /**
   * 프로젝트 항목 이미지 설명 업데이트
   */
  async updateEntryImageDescription(imageId: number, description: string | null): Promise<void> {
    await pool.execute(
      `UPDATE project_entry_images SET description = ? WHERE id = ?`,
      [description, imageId]
    );
  }
}

