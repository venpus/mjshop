import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ProductCollabService } from '../services/productCollabService.js';
import { AdminAccountService } from '../services/adminAccountService.js';
import type {
  CreateProductCollabProductDTO,
  UpdateProductCollabProductDTO,
  CreateMessageDTO,
} from '../models/productCollab.js';
import { getProductCollabImageUrl, getProductCollabFilePathFromUrl } from '../utils/upload.js';

export class ProductCollabController {
  private service: ProductCollabService;
  private adminAccountService: AdminAccountService;

  constructor() {
    this.service = new ProductCollabService();
    this.adminAccountService = new AdminAccountService();
  }

  getActiveProducts = async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;
      const assignee_id = req.query.assignee_id as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset != null ? parseInt(String(req.query.offset), 10) : undefined;
      const options = (limit != null && limit > 0) ? { limit, offset: Math.max(0, offset ?? 0) } : undefined;
      const result = await this.service.getActiveProducts({ status, category, assignee_id, search }, options);
      res.json({ success: true, data: result.items, total: result.total });
    } catch (error: unknown) {
      console.error('Product collab list error:', error);
      res.status(500).json({ success: false, error: '제품 목록 조회 중 오류가 발생했습니다.' });
    }
  };

  getCompletedProducts = async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const list = await this.service.getCompletedProducts({ search });
      res.json({ success: true, data: list });
    } catch (error: unknown) {
      console.error('Product collab archive error:', error);
      res.status(500).json({ success: false, error: '완료 제품 목록 조회 중 오류가 발생했습니다.' });
    }
  };

  getCancelledProducts = async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const list = await this.service.getCancelledProducts({ search });
      res.json({ success: true, data: list });
    } catch (error: unknown) {
      console.error('Product collab cancelled list error:', error);
      res.status(500).json({ success: false, error: '취소 제품 목록 조회 중 오류가 발생했습니다.' });
    }
  };

  getProductCounts = async (_req: Request, res: Response) => {
    try {
      const counts = await this.service.getProductCounts();
      res.json({ success: true, data: counts });
    } catch (error: unknown) {
      console.error('Product collab counts error:', error);
      res.status(500).json({ success: false, error: '제품 수 조회 중 오류가 발생했습니다.' });
    }
  };

  getProductById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id ?? null;
      const product = await this.service.getProductById(id, userId);
      if (!product) {
        return res.status(404).json({ success: false, error: '제품을 찾을 수 없습니다.' });
      }
      res.json({ success: true, data: product });
    } catch (error: unknown) {
      console.error('Product collab get error:', error);
      res.status(500).json({ success: false, error: '제품 조회 중 오류가 발생했습니다.' });
    }
  };

  createProduct = async (req: Request, res: Response) => {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const dto: CreateProductCollabProductDTO = {
        name: req.body.name,
        category: req.body.category ?? null,
        request_note: req.body.request_note?.trim() || null,
        request_links: Array.isArray(req.body.request_links) ? req.body.request_links.filter((u: unknown) => typeof u === 'string' && u.trim()) : null,
        request_image_urls: Array.isArray(req.body.request_image_urls) ? req.body.request_image_urls.filter((u: unknown) => typeof u === 'string' && u.trim()) : null,
        created_by: userId ?? null,
      };
      if (!dto.name?.trim()) {
        return res.status(400).json({ success: false, error: '제품 이름은 필수입니다.' });
      }
      const product = await this.service.createProduct(dto);
      res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      console.error('Product collab create error:', error);
      res.status(500).json({ success: false, error: '제품 생성 중 오류가 발생했습니다.' });
    }
  };

  updateProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      const dto: UpdateProductCollabProductDTO = {
        name: req.body.name,
        status: req.body.status,
        category: req.body.category,
        assignee_id: req.body.assignee_id,
        main_image_id: req.body.main_image_id,
        price: req.body.price,
        moq: req.body.moq,
        lead_time: req.body.lead_time,
        packaging: req.body.packaging,
        inner_packaging: req.body.inner_packaging,
        sku_count: req.body.sku_count,
        request_note: req.body.request_note !== undefined ? (req.body.request_note?.trim() || null) : undefined,
        request_links: req.body.request_links !== undefined
          ? (Array.isArray(req.body.request_links) ? req.body.request_links.filter((u: unknown) => typeof u === 'string' && u.trim()) : null)
          : undefined,
        request_image_urls: req.body.request_image_urls !== undefined
          ? (Array.isArray(req.body.request_image_urls) ? req.body.request_image_urls.filter((u: unknown) => typeof u === 'string' && u.trim()) : null)
          : undefined,
        updated_by: userId ?? undefined,
      };
      const product = await this.service.updateProduct(id, dto);
      if (!product) {
        return res.status(404).json({ success: false, error: '제품을 찾을 수 없습니다.' });
      }
      res.json({ success: true, data: product });
    } catch (error: unknown) {
      console.error('Product collab update error:', error);
      res.status(500).json({ success: false, error: '제품 수정 중 오류가 발생했습니다.' });
    }
  };

  deleteProduct = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const product = await this.service.getProductById(id, null);
      if (!product) {
        return res.status(404).json({ success: false, error: '제품을 찾을 수 없습니다.' });
      }
      if (product.status === 'PRODUCTION_COMPLETE') {
        return res.status(400).json({ success: false, error: '생산 완료된 제품은 삭제할 수 없습니다.' });
      }
      const deleted = await this.service.deleteProduct(id, product.status ?? undefined);
      if (!deleted) {
        return res.status(400).json({ success: false, error: '제품을 삭제할 수 없습니다.' });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Product collab delete error:', error);
      res.status(500).json({ success: false, error: '제품 삭제 중 오류가 발생했습니다.' });
    }
  };

  createMessage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const dto: CreateMessageDTO = {
        product_id: productId,
        parent_id: req.body.parent_id ?? null,
        author_id: userId,
        body: req.body.body ?? null,
        tag: req.body.tag ?? null,
        attachment_urls: req.body.attachment_urls,
        mention_user_ids: req.body.mention_user_ids,
      };
      const message = await this.service.createMessage(dto);
      res.status(201).json({ success: true, data: message });
    } catch (error: unknown) {
      console.error('Product collab message create error:', error);
      res.status(500).json({ success: false, error: '메시지 작성 중 오류가 발생했습니다.' });
    }
  };

  updateMessage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const messageId = parseInt(req.params.messageId, 10);
      if (isNaN(productId) || isNaN(messageId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const message = await this.service.getMessageById(messageId);
      if (!message || message.product_id !== productId) {
        return res.status(404).json({ success: false, error: '메시지를 찾을 수 없습니다.' });
      }
      if (message.author_id !== userId) {
        return res.status(403).json({ success: false, error: '본인이 작성한 메시지만 수정할 수 있습니다.' });
      }
      const updated = await this.service.updateMessage(messageId, productId, {
        body: req.body.body,
        tag: req.body.tag,
        attachment_urls: req.body.attachment_urls,
      });
      if (!updated) {
        return res.status(400).json({ success: false, error: '수정할 내용이 없습니다.' });
      }
      res.json({ success: true, data: updated });
    } catch (error: unknown) {
      console.error('Product collab message update error:', error);
      res.status(500).json({ success: false, error: '메시지 수정 중 오류가 발생했습니다.' });
    }
  };

  deleteMessage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const messageId = parseInt(req.params.messageId, 10);
      if (isNaN(productId) || isNaN(messageId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const message = await this.service.getMessageById(messageId);
      if (!message || message.product_id !== productId) {
        return res.status(404).json({ success: false, error: '메시지를 찾을 수 없습니다.' });
      }
      if (message.author_id !== userId) {
        return res.status(403).json({ success: false, error: '본인이 작성한 메시지만 삭제할 수 있습니다.' });
      }
      const deleted = await this.service.deleteMessage(messageId, productId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: '메시지를 찾을 수 없습니다.' });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Product collab message delete error:', error);
      res.status(500).json({ success: false, error: '메시지 삭제 중 오류가 발생했습니다.' });
    }
  };

  getDashboard = async (req: Request, res: Response) => {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id ?? '';
      const [myTasksResult, assigneePreview, statusCounts, confirmationsResult, repliesResult, assigneeTotalResult] = await Promise.all([
        this.service.getMyTasks(userId, { limit: 4, offset: 0 }),
        this.service.getAssigneeTasksForDashboard(userId || null),
        this.service.getStatusCounts(),
        userId ? this.service.getConfirmationsReceived(userId, { limit: 4, offset: 0 }) : Promise.resolve({ items: [], total: 0 }),
        userId ? this.service.getRepliesToMyMessages(userId, { limit: 4, offset: 0 }) : Promise.resolve({ items: [], total: 0 }),
        this.service.getAllAssigneeTasks(userId || null, { limit: 1, offset: 0 }),
      ]);
      res.json({
        success: true,
        data: {
          myTasks: myTasksResult.items,
          myTasksTotal: myTasksResult.total,
          allAssigneeTasks: assigneePreview,
          allAssigneeTasksTotal: assigneeTotalResult.total,
          statusCounts,
          confirmationsReceived: confirmationsResult.items,
          confirmationsReceivedTotal: confirmationsResult.total,
          repliesToMyMessages: repliesResult.items,
          repliesToMyMessagesTotal: repliesResult.total,
        },
      });
    } catch (error: unknown) {
      console.error('Product collab dashboard error:', error);
      res.status(500).json({ success: false, error: '대시보드 조회 중 오류가 발생했습니다.' });
    }
  };

  postAiWorkSummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id ?? '';
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const lang = (req.query.lang ?? req.body?.lang ?? 'ko') as string;
      const language = lang === 'zh' ? 'zh' : 'ko';
      const { getAiWorkSummary } = await import('../services/aiWorkSummaryService.js');
      const result = await getAiWorkSummary(userId, language);
      if (!result) {
        return res.status(503).json({ success: false, error: 'AI 요약을 생성할 수 없습니다. DASHSCOPE_API_KEY를 확인하세요.' });
      }
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      console.error('Product collab AI work summary error:', error);
      res.status(500).json({ success: false, error: '업무 요약 중 오류가 발생했습니다.' });
    }
  };

  getDashboardSection = async (req: Request, res: Response) => {
    try {
      const userId = (req as unknown as { user?: { id: string } }).user?.id ?? '';
      const section = req.params.section as string;
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 15));
      const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
      const validSections = ['my-tasks', 'confirmations', 'replies', 'assignee-tasks'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 섹션입니다.' });
      }
      if (section === 'my-tasks' || section === 'confirmations' || section === 'replies') {
        if (!userId) {
          return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
        }
      }
      let items: unknown[];
      let total: number;
      if (section === 'my-tasks') {
        const r = await this.service.getMyTasks(userId, { limit, offset });
        items = r.items;
        total = r.total;
      } else if (section === 'confirmations') {
        const r = await this.service.getConfirmationsReceived(userId, { limit, offset });
        items = r.items;
        total = r.total;
      } else if (section === 'replies') {
        const r = await this.service.getRepliesToMyMessages(userId, { limit, offset });
        items = r.items;
        total = r.total;
      } else {
        const r = await this.service.getAllAssigneeTasks(userId || null, { limit, offset });
        items = r.items;
        total = r.total;
      }
      res.json({ success: true, data: { items, total } });
    } catch (error: unknown) {
      console.error('Product collab dashboard section error:', error);
      res.status(500).json({ success: false, error: '목록 조회 중 오류가 발생했습니다.' });
    }
  };

  getMentionableUsers = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as unknown as { user?: { id: string } }).user?.id;
      const accounts = await this.adminAccountService.getAllAccounts();
      let list = accounts
        .filter((a) => a.is_active)
        .map((a) => ({ id: a.id, name: a.name }));
      if (currentUserId) {
        list = list.filter((a) => a.id !== currentUserId);
      }
      res.json({ success: true, data: list });
    } catch (error: unknown) {
      console.error('Product collab mentionable users error:', error);
      res.status(500).json({ success: false, error: '멘션 가능 사용자 조회 중 오류가 발생했습니다.' });
    }
  };

  completeTask = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const taskId = parseInt(req.params.taskId, 10);
      if (isNaN(productId) || isNaN(taskId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다.' });
      }
      const userId = (req as unknown as { user?: { id: string } }).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const updated = await this.service.completeTask(taskId, productId, userId);
      if (!updated) {
        return res.status(403).json({ success: false, error: '본인에게 할당된 태스크만 완료할 수 있습니다.' });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Product collab complete task error:', error);
      res.status(500).json({ success: false, error: '태스크 완료 처리 중 오류가 발생했습니다.' });
    }
  };

  addProductImage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const imageUrl = req.body.image_url as string;
      if (!imageUrl?.trim()) {
        return res.status(400).json({ success: false, error: 'image_url은 필수입니다.' });
      }
      const setAsMain = req.body.set_as_main === true;
      const userId = (req as unknown as { user?: { id: string } }).user?.id ?? null;
      const image = await this.service.addProductImage(
        productId,
        imageUrl.trim(),
        setAsMain ? 'final' : 'candidate',
        userId
      );
      if (setAsMain) {
        await this.service.setMainImage(productId, image.id);
      }
      res.status(201).json({ success: true, data: image });
    } catch (error: unknown) {
      console.error('Product collab add image error:', error);
      res.status(500).json({ success: false, error: '이미지 추가 중 오류가 발생했습니다.' });
    }
  };

  setMainImage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const imageId = parseInt(req.params.imageId, 10);
      if (isNaN(productId) || isNaN(imageId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다.' });
      }
      await this.service.setMainImage(productId, imageId);
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Product collab set main image error:', error);
      res.status(500).json({ success: false, error: '대표 이미지 설정 중 오류가 발생했습니다.' });
    }
  };

  deleteProductImage = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const imageId = parseInt(req.params.imageId, 10);
      if (isNaN(productId) || isNaN(imageId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 ID입니다.' });
      }
      const deleted = await this.service.deleteProductImage(productId, imageId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: '해당 이미지를 찾을 수 없습니다.' });
      }
      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Product collab delete image error:', error);
      res.status(500).json({ success: false, error: '이미지 삭제 중 오류가 발생했습니다.' });
    }
  };

  uploadProductImages = async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        return res.status(400).json({ success: false, error: '업로드할 파일이 없습니다.' });
      }
      const urls = files.map((file) => {
        const relativePath = `product-collab/${productId}/${file.filename}`;
        return getProductCollabImageUrl(relativePath);
      });
      res.json({ success: true, data: { urls } });
    } catch (error: unknown) {
      console.error('Product collab upload images error:', error);
      res.status(500).json({ success: false, error: '파일 업로드 중 오류가 발생했습니다.' });
    }
  };

  /** 스레드 첨부 파일 다운로드 (Content-Disposition으로 원본 파일명 적용) */
  downloadAttachment = async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId;
      const pathParam = (req.query.path as string)?.replace(/^\/+/, '');
      const name = (req.query.name as string) || 'download';
      if (!pathParam || !pathParam.startsWith('product-collab/')) {
        return res.status(400).json({ success: false, error: '유효하지 않은 경로입니다.' });
      }
      const filePath = getProductCollabFilePathFromUrl(pathParam);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다.' });
      }
      const safeName = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_') || 'download';
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
      res.sendFile(path.resolve(filePath));
    } catch (error: unknown) {
      console.error('Product collab download error:', error);
      res.status(500).json({ success: false, error: '다운로드 중 오류가 발생했습니다.' });
    }
  };
}
