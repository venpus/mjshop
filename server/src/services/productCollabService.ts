import { ProductCollabRepository } from '../repositories/productCollabRepository.js';
import { translateKoreanChinese } from './translationService.js';
import type {
  ProductCollabProductListItem,
  ProductCollabProductDetail,
  ProductCollabProduct,
  ProductCollabMessage,
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

export class ProductCollabService {
  private repository: ProductCollabRepository;

  constructor() {
    this.repository = new ProductCollabRepository();
  }

  async getActiveProducts(params: {
    status?: string;
    category?: string;
    assignee_id?: string;
    search?: string;
  }): Promise<ProductCollabProductListItem[]> {
    return this.repository.findActiveProducts(params);
  }

  async getCompletedProducts(params: { search?: string }): Promise<ProductCollabProductListItem[]> {
    return this.repository.findCompletedProducts(params);
  }

  async getCancelledProducts(params: { search?: string }): Promise<ProductCollabProductListItem[]> {
    return this.repository.findCancelledProducts(params);
  }

  async getProductById(id: number, currentUserId?: string | null): Promise<ProductCollabProductDetail | null> {
    return this.repository.findProductById(id, currentUserId);
  }

  async createProduct(dto: CreateProductCollabProductDTO): Promise<ProductCollabProduct> {
    const requestNote = dto.request_note?.trim();
    if (requestNote) {
      const result = await translateKoreanChinese(requestNote);
      if (result) {
        dto.request_note_translated = result.translated;
        dto.request_note_lang = result.detectedLang ?? null;
      }
    }
    return this.repository.createProduct(dto);
  }

  async updateProduct(id: number, dto: UpdateProductCollabProductDTO): Promise<ProductCollabProduct | null> {
    if (dto.request_note !== undefined) {
      const requestNote = dto.request_note?.trim();
      if (requestNote) {
        const result = await translateKoreanChinese(requestNote);
        if (result) {
          dto.request_note_translated = result.translated;
          dto.request_note_lang = result.detectedLang ?? null;
        }
      } else {
        dto.request_note_translated = null;
        dto.request_note_lang = null;
      }
    }
    return this.repository.updateProduct(id, dto);
  }

  async createMessage(dto: CreateMessageDTO): Promise<ProductCollabMessage> {
    const message = await this.repository.createMessage(dto);
    const body = (dto.body ?? '').trim();
    if (body) {
      const result = await translateKoreanChinese(body);
      if (result) {
        await this.repository.updateMessageTranslation(message.id, dto.product_id, {
          body_translated: result.translated,
          body_lang: result.detectedLang ?? null,
        });
        return { ...message, body_translated: result.translated, body_lang: result.detectedLang ?? null };
      }
    }
    return message;
  }

  async getMessageById(messageId: number): Promise<{ id: number; product_id: number; author_id: string } | null> {
    return this.repository.getMessageById(messageId);
  }

  async updateMessage(
    messageId: number,
    productId: number,
    dto: UpdateMessageDTO
  ): Promise<ProductCollabMessage | null> {
    const updated = await this.repository.updateMessage(messageId, productId, dto);
    if (updated && dto.body !== undefined) {
      const body = (dto.body ?? '').trim();
      if (body) {
        const result = await translateKoreanChinese(body);
        if (result) {
          await this.repository.updateMessageTranslation(messageId, productId, {
            body_translated: result.translated,
            body_lang: result.detectedLang ?? null,
          });
          return { ...updated, body_translated: result.translated, body_lang: result.detectedLang ?? null };
        }
      }
      return { ...updated, body_translated: null, body_lang: null };
    }
    return updated;
  }

  async deleteMessage(messageId: number, productId: number): Promise<boolean> {
    return this.repository.deleteMessage(messageId, productId);
  }

  async getMyTasks(userId: string): Promise<DashboardMyTask[]> {
    return this.repository.findMyTasks(userId);
  }

  async completeTask(taskId: number, productId: number, assigneeId: string): Promise<boolean> {
    return this.repository.completeTask(taskId, productId, assigneeId);
  }

  async getTeamTasks(currentUserId: string): Promise<DashboardTeamTask[]> {
    return this.repository.findTeamTasks(currentUserId);
  }

  async getAllAssigneeTasks(excludeUserId: string | null): Promise<DashboardAllAssigneeTask[]> {
    return this.repository.findAllAssigneeTasks(excludeUserId);
  }

  async getStatusCounts(): Promise<DashboardStatusCount[]> {
    return this.repository.getStatusCounts();
  }

  async getProductCounts(): Promise<{ activeCount: number; archiveCount: number; cancelledCount: number }> {
    return this.repository.getProductCounts();
  }

  async getConfirmationsReceived(authorId: string): Promise<DashboardConfirmation[]> {
    return this.repository.findConfirmationsReceived(authorId);
  }

  async getRepliesToMyMessages(userId: string): Promise<DashboardReplyItem[]> {
    return this.repository.findRepliesToMyMessages(userId);
  }

  async addProductImage(
    productId: number,
    imageUrl: string,
    kind: 'candidate' | 'final',
    createdBy: string | null
  ): Promise<ProductCollabProductImage> {
    return this.repository.createProductImage(productId, imageUrl, kind, createdBy);
  }

  async setMainImage(productId: number, imageId: number): Promise<void> {
    return this.repository.setProductMainImage(productId, imageId);
  }

  async deleteProductImage(productId: number, imageId: number): Promise<boolean> {
    return this.repository.deleteProductImage(productId, imageId);
  }
}
