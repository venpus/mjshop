import { Request, Response } from 'express';
import { ProductCollabService } from '../services/productCollabService.js';
import { AdminAccountService } from '../services/adminAccountService.js';
import type {
  CreateProductCollabProductDTO,
  UpdateProductCollabProductDTO,
  CreateMessageDTO,
} from '../models/productCollab.js';
import { getProductCollabImageUrl } from '../utils/upload.js';

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
      const list = await this.service.getActiveProducts({ status, category, assignee_id, search });
      res.json({ success: true, data: list });
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

  getProductById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: '유효하지 않은 제품 ID입니다.' });
      }
      const product = await this.service.getProductById(id);
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
        sku_count: req.body.sku_count,
        request_note: req.body.request_note !== undefined ? (req.body.request_note?.trim() || null) : undefined,
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
      const [myTasks, teamTasks, allAssigneeTasks, statusCounts] = await Promise.all([
        this.service.getMyTasks(userId),
        this.service.getTeamTasks(userId),
        this.service.getAllAssigneeTasks(),
        this.service.getStatusCounts(),
      ]);
      res.json({
        success: true,
        data: { myTasks, teamTasks, allAssigneeTasks, statusCounts },
      });
    } catch (error: unknown) {
      console.error('Product collab dashboard error:', error);
      res.status(500).json({ success: false, error: '대시보드 조회 중 오류가 발생했습니다.' });
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
        return res.status(400).json({ success: false, error: '업로드할 이미지 파일이 없습니다.' });
      }
      const urls = files.map((file) => {
        const relativePath = `product-collab/${productId}/${file.filename}`;
        return getProductCollabImageUrl(relativePath);
      });
      res.json({ success: true, data: { urls } });
    } catch (error: unknown) {
      console.error('Product collab upload images error:', error);
      res.status(500).json({ success: false, error: '이미지 업로드 중 오류가 발생했습니다.' });
    }
  };
}
