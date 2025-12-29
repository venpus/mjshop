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

export class PackingListController {
  private service: PackingListService;

  constructor() {
    this.service = new PackingListService();
  }

  /**
   * 모든 패킹리스트 조회
   * GET /api/packing-lists
   */
  getAllPackingLists = async (req: Request, res: Response) => {
    try {
      const packingLists = await this.service.getAllPackingLists();
      res.json({
        success: true,
        data: packingLists,
      });
    } catch (error) {
      console.error('패킹리스트 조회 오류:', error);
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
      console.error('패킹리스트 조회 오류:', error);
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
      console.error('패킹리스트 조회 오류:', error);
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
      console.error('패킹리스트 생성 오류:', error);
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
      console.error('패킹리스트 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '패킹리스트 수정 중 오류가 발생했습니다.',
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
      console.error('패킹리스트 삭제 오류:', error);
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
      console.error('패킹리스트 아이템 생성 오류:', error);
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
      console.error('패킹리스트 아이템 수정 오류:', error);
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
      console.error('패킹리스트 아이템 삭제 오류:', error);
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
      console.error('내륙송장 생성 오류:', error);
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
      console.error('내륙송장 수정 오류:', error);
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
      console.error('내륙송장 삭제 오류:', error);
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
      console.error('한국도착일 생성 오류:', error);
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
      console.error('한국도착일 수정 오류:', error);
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
      console.error('한국도착일 삭제 오류:', error);
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
      console.error('배송비 조회 오류:', error);
      console.error('오류 상세:', error.message);
      console.error('오류 스택:', error.stack);
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
      console.error('배송 수량 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '배송 수량 조회 중 오류가 발생했습니다.',
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
      console.error('내륙송장 이미지 업로드 오류:', error);
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
      console.error('내륙송장 이미지 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '내륙송장 이미지 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}

// 이미지 업로드를 위한 multer 미들웨어 내보내기
export { packingListImageUpload };

