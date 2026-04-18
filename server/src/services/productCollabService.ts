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
import { getProductCollabProductUploadDir } from '../utils/upload.js';
import fs from 'fs';

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
  }, options?: { limit?: number; offset?: number }): Promise<{ items: ProductCollabProductListItem[]; total: number }> {
    return this.repository.findActiveProducts(params, options);
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
          body_translation_provider: result.provider ?? null,
        });
        return {
          ...message,
          body_translated: result.translated,
          body_lang: result.detectedLang ?? null,
          body_translation_provider: result.provider ?? null,
        };
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
            body_translation_provider: result.provider ?? null,
          });
          return {
            ...updated,
            body_translated: result.translated,
            body_lang: result.detectedLang ?? null,
            body_translation_provider: result.provider ?? null,
          };
        }
      }
      return { ...updated, body_translated: null, body_lang: null, body_translation_provider: null };
    }
    return updated;
  }

  async deleteMessage(messageId: number, productId: number): Promise<boolean> {
    return this.repository.deleteMessage(messageId, productId);
  }

  async getMyTasks(userId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardMyTask[]; total: number }> {
    return this.repository.findMyTasks(userId, options);
  }

  async completeTask(taskId: number, productId: number, assigneeId: string): Promise<boolean> {
    return this.repository.completeTask(taskId, productId, assigneeId);
  }

  async getTeamTasks(currentUserId: string): Promise<DashboardTeamTask[]> {
    return this.repository.findTeamTasks(currentUserId);
  }

  async getAllAssigneeTasks(excludeUserId: string | null, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardAllAssigneeTask[]; total: number }> {
    return this.repository.findAllAssigneeTasks(excludeUserId, options);
  }

  async getAssigneeTasksForDashboard(excludeUserId: string | null): Promise<DashboardAllAssigneeTask[]> {
    return this.repository.findAssigneeTasksForDashboard(excludeUserId);
  }

  async getStatusCounts(): Promise<DashboardStatusCount[]> {
    return this.repository.getStatusCounts();
  }

  async getProductCounts(): Promise<{ activeCount: number; archiveCount: number; cancelledCount: number }> {
    return this.repository.getProductCounts();
  }

  async getUnreadThreadMessageCount(userId: string): Promise<number> {
    return this.repository.countUnreadThreadMessagesForUser(userId);
  }

  /** 제품 스레드 페이지 조회 완료 시 호출: 현재까지의 최신 메시지 시각까지 읽음 처리 */
  async markThreadViewed(userId: string, productId: number): Promise<boolean> {
    const product = await this.repository.findProductById(productId, userId);
    if (!product) return false;
    const maxAt = await this.repository.getMaxMessageCreatedAtForProduct(productId);
    const cursor = maxAt ?? new Date();
    await this.repository.upsertThreadView(userId, productId, cursor);
    return true;
  }

  async getConfirmationsReceived(authorId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardConfirmation[]; total: number }> {
    return this.repository.findConfirmationsReceived(authorId, options);
  }

  async getRepliesToMyMessages(userId: string, options?: { limit?: number; offset?: number }): Promise<{ items: DashboardReplyItem[]; total: number }> {
    return this.repository.findRepliesToMyMessages(userId, options);
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

  /** 진행중/취소 상태인 제품만 삭제 가능. DB 삭제 후 해당 제품 업로드 폴더 제거. */
  async deleteProduct(id: number, currentStatus?: string | null): Promise<boolean> {
    const allowedStatuses = ['RESEARCH', 'SAMPLE_TEST', 'CONFIG_CONFIRM', 'ORDER_PENDING', 'INCOMING', 'IN_PRODUCTION', 'ISSUE_OCCURRED', 'CANCELLED'];
    if (currentStatus != null && !allowedStatuses.includes(currentStatus)) {
      return false;
    }
    const ok = await this.repository.deleteProduct(id);
    if (ok) {
      try {
        const dir = getProductCollabProductUploadDir(id);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true });
        }
      } catch (e) {
        console.error('Product collab upload dir remove failed:', e);
      }
    }
    return ok;
  }
}
