import { Request, Response } from 'express';
import { PaymentRequestService } from '../services/paymentRequestService.js';
import { PaymentHistoryService } from '../services/paymentHistoryService.js';
import {
  CreatePaymentRequestDTO,
  UpdatePaymentRequestDTO,
  CompletePaymentRequestDTO,
  PaymentRequestFilter,
} from '../models/paymentRequest.js';

export class PaymentRequestController {
  private service: PaymentRequestService;
  private historyService: PaymentHistoryService;

  constructor() {
    this.service = new PaymentRequestService();
    this.historyService = new PaymentHistoryService();
  }

  /**
   * 모든 지급요청 조회
   * GET /api/payment-requests
   */
  getAllPaymentRequests = async (req: Request, res: Response) => {
    try {
      const filter: PaymentRequestFilter = {
        status: req.query.status as any,
        source_type: req.query.source_type as any,
        payment_type: req.query.payment_type as any,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        search: req.query.search as string,
      };

      // 빈 값 제거
      Object.keys(filter).forEach((key) => {
        if (filter[key as keyof PaymentRequestFilter] === undefined) {
          delete filter[key as keyof PaymentRequestFilter];
        }
      });

      const requests = await this.service.getAllPaymentRequests(filter);
      res.json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      console.error('지급요청 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '지급요청 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 지급요청 조회
   * GET /api/payment-requests/:id
   */
  getPaymentRequestById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await this.service.getPaymentRequestById(parseInt(id));

      if (!request) {
        return res.status(404).json({
          success: false,
          error: '지급요청을 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      console.error('지급요청 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '지급요청 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 출처 정보로 지급요청 조회
   * GET /api/payment-requests/source/:sourceType/:sourceId
   */
  getPaymentRequestsBySource = async (req: Request, res: Response) => {
    try {
      const { sourceType, sourceId } = req.params;
      const paymentType = req.query.payment_type as string | undefined;

      const requests = await this.service.getPaymentRequestsBySource(
        sourceType,
        sourceId,
        paymentType
      );

      res.json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      console.error('지급요청 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '지급요청 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 지급요청 생성
   * POST /api/payment-requests
   */
  createPaymentRequest = async (req: Request, res: Response) => {
    try {
      const data: CreatePaymentRequestDTO = req.body;
      const requestedBy = (req as any).user?.id;

      // 필수 필드 검증
      if (!data.source_type || !data.source_id || !data.payment_type || !data.amount) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.',
        });
      }

      const request = await this.service.createPaymentRequest(data, requestedBy);

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      console.error('지급요청 생성 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '지급요청 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 지급요청 수정
   * PUT /api/payment-requests/:id
   */
  updatePaymentRequest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdatePaymentRequestDTO = req.body;

      const updated = await this.service.updatePaymentRequest(parseInt(id), data);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error('지급요청 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '지급요청 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 지급완료 처리
   * PUT /api/payment-requests/:id/complete
   */
  completePaymentRequest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: CompletePaymentRequestDTO = req.body;
      const completedBy = (req as any).user?.id;

      // 필수 필드 검증
      if (!data.payment_date) {
        return res.status(400).json({
          success: false,
          error: '지급일이 필요합니다.',
        });
      }

      const completed = await this.service.completePaymentRequest(
        parseInt(id),
        data,
        completedBy
      );

      res.json({
        success: true,
        data: completed,
      });
    } catch (error: any) {
      console.error('지급완료 처리 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '지급완료 처리 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 일괄 지급완료 처리
   * POST /api/payment-requests/batch-complete
   */
  batchCompletePaymentRequests = async (req: Request, res: Response) => {
    try {
      const { ids, payment_date } = req.body;
      const completedBy = (req as any).user?.id;

      // 필수 필드 검증
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '지급요청 ID 배열이 필요합니다.',
        });
      }

      if (!payment_date) {
        return res.status(400).json({
          success: false,
          error: '지급일이 필요합니다.',
        });
      }

      const data: CompletePaymentRequestDTO = {
        payment_date,
        completed_by: completedBy,
      };

      const affectedRows = await this.service.batchCompletePaymentRequests(ids, data, completedBy);

      res.json({
        success: true,
        data: { affectedRows },
      });
    } catch (error: any) {
      console.error('일괄 지급완료 처리 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '일괄 지급완료 처리 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 지급요청 삭제
   * DELETE /api/payment-requests/:id
   */
  deletePaymentRequest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deletePaymentRequest(parseInt(id));

      res.json({
        success: true,
        message: '지급요청이 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('지급요청 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error.message || '지급요청 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 결제내역 조회 (발주관리 + 패킹리스트 통합)
   * GET /api/payment-requests/history
   */
  getPaymentHistory = async (req: Request, res: Response) => {
    try {
      const filter = {
        // type: req.query.type as 'all' | 'purchase-orders' | 'packing-lists' | undefined,
        type: req.query.type as 'purchase-orders' | 'packing-lists' | undefined,
        status: req.query.status as 'all' | 'paid' | 'pending' | undefined,
        start_date: req.query.start_date as string | undefined,
        end_date: req.query.end_date as string | undefined,
        search: req.query.search as string | undefined,
      };

      const history = await this.historyService.getPaymentHistory(filter);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('결제내역 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '결제내역 조회 중 오류가 발생했습니다.',
      });
    }
  };
}

