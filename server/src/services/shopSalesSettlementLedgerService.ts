import type {
  CreateSalesSettlementLedgerDTO,
  SalesSettlementLedgerPartner,
} from '../models/shopSalesSettlementLedger.js';
import { ShopSalesSettlementLedgerRepository } from '../repositories/shopSalesSettlementLedgerRepository.js';

export class ShopSalesSettlementLedgerService {
  private repository = new ShopSalesSettlementLedgerRepository();

  getAllSummaries() {
    return this.repository.getAllSummaries();
  }

  list(partner: SalesSettlementLedgerPartner, page: number, limit: number) {
    return this.repository.list(partner, page, limit);
  }

  async create(data: CreateSalesSettlementLedgerDTO) {
    if (!data.settlementDate?.trim()) {
      throw new Error('정산일을 입력해 주세요.');
    }
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw new Error('정산금액은 1원 이상의 정수로 입력해 주세요.');
    }
    if (data.partner !== 'wk' && data.partner !== 'inventio') {
      throw new Error('정산 파트너가 올바르지 않습니다.');
    }

    return this.repository.create({
      partner: data.partner,
      settlementDate: data.settlementDate.trim().slice(0, 10),
      amount: data.amount,
      note: data.note?.trim() ? data.note.trim().slice(0, 255) : null,
    });
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
