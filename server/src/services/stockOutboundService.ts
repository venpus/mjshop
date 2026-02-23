import { StockOutboundRepository } from '../repositories/stockOutboundRepository.js';
import { StockOutboundRecord, CreateStockOutboundRecordDTO, UpdateStockOutboundRecordDTO } from '../models/stockOutbound.js';

export class StockOutboundService {
  private repository: StockOutboundRepository;

  constructor() {
    this.repository = new StockOutboundRepository();
  }

  /**
   * 최근 출고 기록 목록 조회 (AI 검색용)
   */
  async getAllRecords(limit: number = 50): Promise<StockOutboundRecord[]> {
    return await this.repository.findAll(limit);
  }

  /**
   * groupKey로 출고 기록 목록 조회
   */
  async getRecordsByGroupKey(groupKey: string): Promise<StockOutboundRecord[]> {
    return await this.repository.findByGroupKey(groupKey);
  }

  /**
   * ID로 출고 기록 조회
   */
  async getRecordById(id: number): Promise<StockOutboundRecord | null> {
    return await this.repository.findById(id);
  }

  /**
   * 출고 기록 생성
   */
  async createRecord(data: CreateStockOutboundRecordDTO): Promise<StockOutboundRecord> {
    // 유효성 검사
    if (!data.groupKey || !data.outboundDate || !data.customerName || data.quantity === undefined) {
      throw new Error('필수 필드가 누락되었습니다.');
    }

    if (data.quantity <= 0) {
      throw new Error('출고 수량은 0보다 커야 합니다.');
    }

    return await this.repository.create(data);
  }

  /**
   * 출고 기록 수정
   */
  async updateRecord(id: number, data: UpdateStockOutboundRecordDTO): Promise<StockOutboundRecord> {
    const existingRecord = await this.repository.findById(id);
    if (!existingRecord) {
      throw new Error('출고 기록을 찾을 수 없습니다.');
    }

    // 유효성 검사
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error('출고 수량은 0보다 커야 합니다.');
    }

    return await this.repository.update(id, data);
  }

  /**
   * 출고 기록 삭제
   */
  async deleteRecord(id: number): Promise<void> {
    const existingRecord = await this.repository.findById(id);
    if (!existingRecord) {
      throw new Error('출고 기록을 찾을 수 없습니다.');
    }

    await this.repository.delete(id);
  }

  /**
   * groupKey로 출고 수량 합계 조회
   */
  async getTotalQuantityByGroupKey(groupKey: string): Promise<number> {
    return await this.repository.getTotalQuantityByGroupKey(groupKey);
  }
}

