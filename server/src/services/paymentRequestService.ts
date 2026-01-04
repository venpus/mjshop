import { PaymentRequestRepository } from '../repositories/paymentRequestRepository.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrderRepository.js';
import { PackingListRepository } from '../repositories/packingListRepository.js';
import {
  PaymentRequest,
  PaymentRequestPublic,
  CreatePaymentRequestDTO,
  UpdatePaymentRequestDTO,
  CompletePaymentRequestDTO,
  PaymentRequestFilter,
} from '../models/paymentRequest.js';

export class PaymentRequestService {
  private repository: PaymentRequestRepository;
  private poRepository: PurchaseOrderRepository;
  private plRepository: PackingListRepository;

  constructor() {
    this.repository = new PaymentRequestRepository();
    this.poRepository = new PurchaseOrderRepository();
    this.plRepository = new PackingListRepository();
  }

  /**
   * 모든 지급요청 조회 (필터 적용)
   */
  async getAllPaymentRequests(
    filter?: PaymentRequestFilter
  ): Promise<PaymentRequestPublic[]> {
    const requests = await this.repository.findAll(filter);
    return Promise.all(requests.map((r) => this.enrichPaymentRequest(r)));
  }

  /**
   * ID로 지급요청 조회
   */
  async getPaymentRequestById(id: number): Promise<PaymentRequestPublic | null> {
    const request = await this.repository.findById(id);
    if (!request) {
      return null;
    }
    return this.enrichPaymentRequest(request);
  }

  /**
   * 출처 정보로 지급요청 조회
   */
  async getPaymentRequestsBySource(
    sourceType: string,
    sourceId: string,
    paymentType?: string
  ): Promise<PaymentRequestPublic[]> {
    const requests = await this.repository.findBySource(sourceType, sourceId, paymentType);
    return Promise.all(requests.map((r) => this.enrichPaymentRequest(r)));
  }

  /**
   * 지급요청 생성
   */
  async createPaymentRequest(
    data: CreatePaymentRequestDTO,
    requestedBy?: string
  ): Promise<PaymentRequestPublic> {
    // 중복 체크: 같은 출처와 지급유형에 대해 요청중인 요청이 있는지 확인
    const existingRequests = await this.repository.findBySource(
      data.source_type,
      data.source_id,
      data.payment_type
    );
    const pendingRequest = existingRequests.find((r) => r.status === '요청중');
    if (pendingRequest) {
      throw new Error('이미 지급요청이 존재합니다.');
    }

    // 출처 데이터 검증
    await this.validateSource(data.source_type, data.source_id, data.payment_type);

    const requestData: CreatePaymentRequestDTO = {
      ...data,
      requested_by: requestedBy,
    };

    const request = await this.repository.create(requestData);
    return this.enrichPaymentRequest(request);
  }

  /**
   * 지급요청 수정
   */
  async updatePaymentRequest(
    id: number,
    data: UpdatePaymentRequestDTO
  ): Promise<PaymentRequestPublic> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('지급요청을 찾을 수 없습니다.');
    }

    if (existing.status === '완료') {
      throw new Error('완료된 지급요청은 수정할 수 없습니다.');
    }

    const updated = await this.repository.update(id, data);
    return this.enrichPaymentRequest(updated);
  }

  /**
   * 지급완료 처리
   */
  async completePaymentRequest(
    id: number,
    data: CompletePaymentRequestDTO,
    completedBy?: string
  ): Promise<PaymentRequestPublic> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('지급요청을 찾을 수 없습니다.');
    }

    if (existing.status === '완료') {
      throw new Error('이미 완료된 지급요청입니다.');
    }

    const completeData: CompletePaymentRequestDTO = {
      ...data,
      completed_by: completedBy,
    };

    const completed = await this.repository.complete(id, completeData);

    // 원본 데이터 업데이트
    await this.updateSourcePaymentDate(
      existing.source_type,
      existing.source_id,
      existing.payment_type,
      data.payment_date
    );

    return this.enrichPaymentRequest(completed);
  }

  /**
   * 일괄 지급완료 처리
   */
  async batchCompletePaymentRequests(
    ids: number[],
    data: CompletePaymentRequestDTO,
    completedBy?: string
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    // 모든 요청 조회하여 원본 데이터 업데이트
    const requests = await Promise.all(
      ids.map((id) => this.repository.findById(id))
    );

    const validRequests = requests.filter(
      (r): r is PaymentRequest => r !== null && r.status === '요청중'
    );

    const completeData: CompletePaymentRequestDTO = {
      ...data,
      completed_by: completedBy,
    };

    const affectedRows = await this.repository.batchComplete(ids, completeData);

    // 원본 데이터 업데이트
    for (const request of validRequests) {
      await this.updateSourcePaymentDate(
        request.source_type,
        request.source_id,
        request.payment_type,
        data.payment_date
      );
    }

    return affectedRows;
  }

  /**
   * 지급요청 삭제
   */
  async deletePaymentRequest(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('지급요청을 찾을 수 없습니다.');
    }

    if (existing.status === '완료') {
      throw new Error('완료된 지급요청은 삭제할 수 없습니다.');
    }

    await this.repository.delete(id);
  }

  /**
   * 출처 데이터 검증
   */
  private async validateSource(
    sourceType: string,
    sourceId: string,
    paymentType: string
  ): Promise<void> {
    if (sourceType === 'purchase_order') {
      const po = await this.poRepository.findById(sourceId);
      if (!po) {
        throw new Error('발주를 찾을 수 없습니다.');
      }

      if (paymentType === 'advance') {
        if (po.advance_payment_date) {
          throw new Error('이미 선금이 지급되었습니다.');
        }
        if (!po.advance_payment_amount || po.advance_payment_amount <= 0) {
          throw new Error('선금 금액이 없습니다.');
        }
      } else if (paymentType === 'balance') {
        if (po.balance_payment_date) {
          throw new Error('이미 잔금이 지급되었습니다.');
        }
        if (!po.balance_payment_amount || po.balance_payment_amount <= 0) {
          throw new Error('잔금 금액이 없습니다.');
        }
      }
    } else if (sourceType === 'packing_list') {
      const pl = await this.plRepository.findById(parseInt(sourceId));
      if (!pl) {
        throw new Error('패킹리스트를 찾을 수 없습니다.');
      }

      if (pl.wk_payment_date) {
        throw new Error('이미 배송비가 지급되었습니다.');
      }
      if (!pl.shipping_cost || pl.shipping_cost <= 0) {
        throw new Error('배송비가 없습니다.');
      }
    }
  }

  /**
   * 원본 데이터의 지급일 업데이트
   */
  private async updateSourcePaymentDate(
    sourceType: string,
    sourceId: string,
    paymentType: string,
    paymentDate: string
  ): Promise<void> {
    if (sourceType === 'purchase_order') {
      if (paymentType === 'advance') {
        await this.poRepository.update(sourceId, {
          advance_payment_date: paymentDate,
        });
      } else if (paymentType === 'balance') {
        await this.poRepository.update(sourceId, {
          balance_payment_date: paymentDate,
        });
      }
    } else if (sourceType === 'packing_list') {
      // 패킹리스트 ID로 패킹리스트 조회하여 코드 가져오기
      const packingList = await this.plRepository.findById(parseInt(sourceId));
      if (packingList) {
        // 같은 코드를 가진 모든 패킹리스트의 wk_payment_date 업데이트
        await this.plRepository.updateWkPaymentDateByCode(packingList.code, paymentDate);
      } else {
        // 패킹리스트를 찾을 수 없는 경우, ID로 직접 업데이트
        await this.plRepository.update(parseInt(sourceId), {
          wk_payment_date: paymentDate,
        });
      }
    }
  }

  /**
   * 지급요청에 추가 정보 포함
   */
  private async enrichPaymentRequest(
    request: PaymentRequest
  ): Promise<PaymentRequestPublic> {
    const enriched: PaymentRequestPublic = {
      ...request,
    };

    // 출처 정보 조회
    if (request.source_type === 'purchase_order') {
      const po = await this.poRepository.findById(request.source_id);
      if (po) {
        enriched.source_info = {
          po_number: po.po_number,
          product_name: po.product_name || undefined,
        };
      }
    } else if (request.source_type === 'packing_list') {
      const pl = await this.plRepository.findById(parseInt(request.source_id));
      if (pl) {
        enriched.source_info = {
          packing_code: pl.code,
        };
      }
    }

    // 요청자/완료자 이름 조회 (필요시 AdminAccountRepository 사용)
    // 현재는 ID만 반환

    return enriched;
  }
}

