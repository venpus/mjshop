import { Request, Response } from 'express';
import { PackingListService } from '../services/packingListService.js';
import {
  CreatePackingListDTO,
  UpdatePackingListDTO,
  CreatePackingListItemDTO,
  UpdatePackingListItemDTO,
  CreateDomesticInvoiceDTO,
  UpdateDomesticInvoiceDTO,
  CreateKoreaArrivalDTO,
  UpdateKoreaArrivalDTO,
} from '../models/packingList.js';
import {
  packingListImageUpload,
  moveImageToPackingListInvoiceFolder,
  getPackingListInvoiceImageUrl,
  getNextPackingListInvoiceImageNumber,
  deletePackingListInvoiceImage,
} from '../utils/upload.js';
import path from 'path';
import { logger } from '../utils/logger.js';

export class PackingListController {
  private service: PackingListService;

  constructor() {
    this.service = new PackingListService();
  }

  /**
   * 모든 패킹리스트 조회
   * GET /api/packing-lists
   * - page, limit 있음: 필터+페이징 적용, pagination 포함 응답
   * - year, month 있음: 해당 월만 조회 (기존 호환)
   * - 없음: 전체 조회 (InboundTab, StockDetail 등)
   */
  getAllPackingLists = async (req: Request, res: Response) => {
    try {
      const pageParam = req.query.page;
      const limitParam = req.query.limit;
      const hasPaging = pageParam != null && limitParam != null;

      if (hasPaging) {
        const page = parseInt(pageParam as string, 10);
        const limit = parseInt(limitParam as string, 10);
        if (isNaN(page) || page < 1) {
          return res.status(400).json({
            success: false,
            error: 'page는 1 이상의 정수여야 합니다.',
          });
        }
        if (isNaN(limit) || limit < 1) {
          return res.status(400).json({
            success: false,
            error: 'limit는 1 이상의 정수여야 합니다.',
          });
        }

        const search = req.query.search as string | undefined;
        const logisticsCompaniesParam = req.query.logisticsCompanies as string | undefined;
        const logisticsCompanies = logisticsCompaniesParam
          ? logisticsCompaniesParam.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const statusParam = req.query.status as string | undefined;
        const status = statusParam
          ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        const purchaseOrderId = (req.query.purchaseOrderId as string)?.trim() || undefined;

        const filters = {
          search: search?.trim() || undefined,
          logisticsCompanies,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status,
          purchaseOrderId,
        };

        const result = await this.service.getAllPackingListsPaginated(filters, page, limit);
        return res.json({
          success: true,
          data: result.data,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          },
        });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      if ((year && !month) || (!year && month)) {
        return res.status(400).json({
          success: false,
          error: 'year와 month는 함께 제공되어야 합니다.',
        });
      }
      if (month && (month < 1 || month > 12)) {
        return res.status(400).json({
          success: false,
          error: 'month는 1부터 12 사이의 값이어야 합니다.',
        });
      }

      const packingLists = await this.service.getAllPackingLists(year, month);
      res.json({
        success: true,
        data: packingLists,
      });
    } catch (error) {
      logger.error('패킹리스트 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '패킹리스트 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 패킹리스트 조회
   * GET /api/packing-lists/:id
   */
  getPackingListById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const packingList = await this.service.getPackingListById(id);
      if (!packingList) {
        return res.status(404).json({
          success: false,
          error: '패킹리스트를 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: packingList,
      });
    } catch (error) {
      logger.error('패킹리스트 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '패킹리스트 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 코드로 패킹리스트 조회
   * GET /api/packing-lists/code/:code
   */
  getPackingListByCode = async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const packingList = await this.service.getPackingListByCode(code);
      if (!packingList) {
        return res.status(404).json({
          success: false,
          error: '패킹리스트를 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: packingList,
      });
    } catch (error) {
      logger.error('패킹리스트 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '패킹리스트 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 생성
   * POST /api/packing-lists
   */
  createPackingList = async (req: Request, res: Response) => {
    try {
      const data: CreatePackingListDTO = req.body;

      // 필수 필드 검증
      if (!data.code || !data.shipment_date) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (code, shipment_date)',
        });
      }

      const packingList = await this.service.createPackingList(data);
      res.status(201).json({
        success: true,
        data: packingList,
      });
    } catch (error: any) {
      logger.error('패킹리스트 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 수정
   * PUT /api/packing-lists/:id
   */
  updatePackingList = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: UpdatePackingListDTO = req.body;
      const packingList = await this.service.updatePackingList(id, data);
      res.json({
        success: true,
        data: packingList,
      });
    } catch (error: any) {
      logger.error('패킹리스트 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * A레벨 관리자 비용 지불 완료 상태 업데이트
   * PUT /api/packing-lists/:id/admin-cost-paid
   */
  updateAdminCostPaid = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const { admin_cost_paid } = req.body;

      if (typeof admin_cost_paid !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'admin_cost_paid는 boolean 값이어야 합니다.',
        });
      }

      const packingList = await this.service.updateAdminCostPaid(id, admin_cost_paid);

      res.json({
        success: true,
        data: packingList,
        message: 'A레벨 관리자 비용 지불 완료 상태가 업데이트되었습니다.',
      });
    } catch (error: any) {
      logger.error('A레벨 관리자 비용 지불 완료 상태 업데이트 오류:', error);

      if (error.message.includes('찾을 수 없습니다')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'A레벨 관리자 비용 지불 완료 상태 업데이트 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 삭제
   * DELETE /api/packing-lists/:id
   */
  deletePackingList = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      await this.service.deletePackingList(id);
      res.json({
        success: true,
        message: '패킹리스트가 삭제되었습니다.',
      });
    } catch (error: any) {
      logger.error('패킹리스트 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 아이템 생성
   * POST /api/packing-lists/:id/items
   */
  createItem = async (req: Request, res: Response) => {
    try {
      const packingListId = parseInt(req.params.id);
      if (isNaN(packingListId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: CreatePackingListItemDTO = {
        ...req.body,
        packing_list_id: packingListId,
      };

      // 필수 필드 검증
      if (!data.product_name || !data.box_count || !data.total_quantity) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (product_name, box_count, total_quantity)',
        });
      }

      const item = await this.service.createItem(data);
      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      logger.error('패킹리스트 아이템 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 아이템 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 아이템 수정
   * PUT /api/packing-lists/items/:itemId
   */
  updateItem = async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: UpdatePackingListItemDTO = req.body;
      const item = await this.service.updateItem(itemId, data);
      res.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      logger.error('패킹리스트 아이템 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 아이템 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 패킹리스트 아이템 삭제
   * DELETE /api/packing-lists/items/:itemId
   */
  deleteItem = async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      await this.service.deleteItem(itemId);
      res.json({
        success: true,
        message: '패킹리스트 아이템이 삭제되었습니다.',
      });
    } catch (error: any) {
      logger.error('패킹리스트 아이템 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 아이템 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 내륙송장 생성
   * POST /api/packing-lists/:id/invoices
   */
  createDomesticInvoice = async (req: Request, res: Response) => {
    try {
      const packingListId = parseInt(req.params.id);
      if (isNaN(packingListId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: CreateDomesticInvoiceDTO = {
        ...req.body,
        packing_list_id: packingListId,
        // invoice_number가 없으면 빈 문자열로 설정 (사진만 업로드하는 경우 허용)
        invoice_number: req.body.invoice_number || '',
      };

      const invoice = await this.service.createDomesticInvoice(data);
      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      logger.error('내륙송장 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 내륙송장 수정
   * PUT /api/packing-lists/invoices/:invoiceId
   */
  updateDomesticInvoice = async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: UpdateDomesticInvoiceDTO = req.body;

      const invoice = await this.service.updateDomesticInvoice(invoiceId, data);
      res.json({
        success: true,
        data: invoice,
        message: '내륙송장이 수정되었습니다.',
      });
    } catch (error: any) {
      logger.error('내륙송장 수정 오류:', error);
      if (error.message.includes('찾을 수 없습니다')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 내륙송장 삭제
   * DELETE /api/packing-lists/invoices/:invoiceId
   */
  deleteDomesticInvoice = async (req: Request, res: Response) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      await this.service.deleteDomesticInvoice(invoiceId);
      res.json({
        success: true,
        message: '내륙송장이 삭제되었습니다.',
      });
    } catch (error: any) {
      logger.error('내륙송장 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 한국도착일 생성
   * POST /api/packing-lists/items/:itemId/korea-arrivals
   */
  createKoreaArrival = async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: CreateKoreaArrivalDTO = {
        ...req.body,
        packing_list_item_id: itemId,
      };

      if (!data.arrival_date || !data.quantity) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (arrival_date, quantity)',
        });
      }

      const arrival = await this.service.createKoreaArrival(data);
      res.status(201).json({
        success: true,
        data: arrival,
      });
    } catch (error: any) {
      logger.error('한국도착일 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '한국도착일 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 한국도착일 수정
   * PUT /api/packing-lists/korea-arrivals/:arrivalId
   */
  updateKoreaArrival = async (req: Request, res: Response) => {
    try {
      const arrivalId = parseInt(req.params.arrivalId);
      if (isNaN(arrivalId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const data: UpdateKoreaArrivalDTO = req.body;
      const arrival = await this.service.updateKoreaArrival(arrivalId, data);
      res.json({
        success: true,
        data: arrival,
      });
    } catch (error: any) {
      logger.error('한국도착일 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '한국도착일 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 한국도착일 삭제
   * DELETE /api/packing-lists/korea-arrivals/:arrivalId
   */
  deleteKoreaArrival = async (req: Request, res: Response) => {
    try {
      const arrivalId = parseInt(req.params.arrivalId);
      if (isNaN(arrivalId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      await this.service.deleteKoreaArrival(arrivalId);
      res.json({
        success: true,
        message: '한국도착일이 삭제되었습니다.',
      });
    } catch (error: any) {
      logger.error('한국도착일 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '한국도착일 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 발주별 배송비 집계 조회
   * GET /api/packing-lists/shipping-cost/:purchaseOrderId
   */
  getShippingCostByPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId } = req.params;
      const shippingCost = await this.service.getShippingCostByPurchaseOrder(purchaseOrderId);
      
      if (!shippingCost) {
        // 패킹리스트가 없는 경우 빈 데이터 반환 (404 대신)
        return res.json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: shippingCost,
      });
    } catch (error: any) {
      logger.error('배송비 조회 오류:', error);
      logger.error('오류 상세:', error.message);
      logger.error('오류 스택:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message || '배송비 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 발주별 배송 수량 집계 조회
   * GET /api/packing-lists/shipping-summary/:purchaseOrderId
   */
  getShippingSummaryByPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId } = req.params;
      const summary = await this.service.getShippingSummaryByPurchaseOrder(purchaseOrderId);
      
      if (!summary) {
        // 패킹리스트가 없는 경우 빈 데이터 반환 (404 대신)
        return res.json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('배송 수량 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '배송 수량 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 발주 ID로 연결된 패킹리스트 목록 조회
   * GET /api/packing-lists/by-purchase-order/:purchaseOrderId
   */
  getPackingListsByPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { purchaseOrderId } = req.params;
      const packingLists = await this.service.getPackingListsByPurchaseOrder(purchaseOrderId);
      
      res.json({
        success: true,
        data: packingLists,
      });
    } catch (error) {
      logger.error('패킹리스트 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '패킹리스트 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 내륙송장 이미지 업로드
   * POST /api/packing-lists/:id/invoices/:invoiceId/images
   */
  uploadInvoiceImages = async (req: Request, res: Response) => {
    try {
      const packingListId = parseInt(req.params.id);
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(packingListId) || isNaN(invoiceId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업로드할 이미지 파일이 없습니다.',
        });
      }

      // 패킹리스트 존재 확인
      const packingList = await this.service.getPackingListById(packingListId);
      if (!packingList) {
        return res.status(404).json({
          success: false,
          error: '패킹리스트를 찾을 수 없습니다.',
        });
      }

      // 최대 10장 제한
      const existingImages = await this.service.getInvoiceImagesByInvoiceId(invoiceId);
      if (existingImages.length + files.length > 10) {
        return res.status(400).json({
          success: false,
          error: '내륙송장 이미지는 최대 10장까지 업로드 가능합니다.',
        });
      }

      const imageResults: Array<{ id: number; url: string }> = [];
      let currentImageNumber = await getNextPackingListInvoiceImageNumber(packingListId, invoiceId);

      // 각 파일을 폴더로 이동
      for (const file of files) {
        const ext = path.extname(file.originalname);
        const relativePath = await moveImageToPackingListInvoiceFolder(
          file.path,
          packingListId,
          invoiceId,
          currentImageNumber,
          ext
        );
        const imageUrl = getPackingListInvoiceImageUrl(relativePath);

        // DB에 저장 (이미지 ID 반환받음)
        const image = await this.service.createInvoiceImage(invoiceId, imageUrl, currentImageNumber);
        imageResults.push({
          id: image.id,
          url: imageUrl,
        });
        currentImageNumber++;
      }

      res.json({
        success: true,
        data: {
          images: imageResults,
          message: `${files.length}개의 이미지가 업로드되었습니다.`,
        },
      });
    } catch (error: any) {
      logger.error('내륙송장 이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 이미지 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 내륙송장 이미지 삭제
   * DELETE /api/packing-lists/invoices/images/:imageId
   */
  deleteInvoiceImage = async (req: Request, res: Response) => {
    try {
      const imageId = parseInt(req.params.imageId);
      if (isNaN(imageId)) {
        return res.status(400).json({
          success: false,
          error: '올바른 ID 형식이 아닙니다.',
        });
      }

      // 이미지 삭제 (이미지 URL 반환)
      const imageUrl = await this.service.deleteInvoiceImage(imageId);

      // 파일 시스템에서도 삭제
      if (imageUrl) {
        await deletePackingListInvoiceImage(imageUrl);
      }

      res.json({
        success: true,
        message: '이미지가 삭제되었습니다.',
      });
    } catch (error: any) {
      logger.error('내륙송장 이미지 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 이미지 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 재포장 요구사항 업데이트
   * PUT /api/packing-lists/:id/repackaging-requirements
   */
  updateRepackagingRequirements = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 패킹리스트 ID입니다.',
        });
      }

      const { repackaging_requirements } = req.body;
      await this.service.updateRepackagingRequirements(id, repackaging_requirements || null);

      res.json({
        success: true,
        message: '재포장 요구사항이 업데이트되었습니다.',
      });
    } catch (error: any) {
      logger.error('재포장 요구사항 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '재포장 요구사항 업데이트 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 해외송장 일괄 저장/업데이트
   * PUT /api/packing-lists/:id/overseas-invoices
   */
  saveOverseasInvoices = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 패킹리스트 ID입니다.',
        });
      }

      const { overseas_invoices } = req.body;
      if (!Array.isArray(overseas_invoices)) {
        return res.status(400).json({
          success: false,
          error: '해외송장 데이터가 올바르지 않습니다.',
        });
      }

      const savedInvoices = await this.service.saveOverseasInvoices(id, overseas_invoices);

      res.json({
        success: true,
        data: savedInvoices,
        message: '해외송장이 저장되었습니다.',
      });
    } catch (error: any) {
      logger.error('해외송장 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '해외송장 저장 중 오류가 발생했습니다.',
      });
    }
  };
}

// 이미지 업로드를 위한 multer 미들웨어 내보내기
export { packingListImageUpload };

