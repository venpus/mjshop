import { Request, Response } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrderService.js';
import { CreatePurchaseOrderDTO, UpdatePurchaseOrderDTO } from '../models/purchaseOrder.js';
import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isCostInputAllowed } from '../config/costInputAllowedUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PurchaseOrderController {
  private service: PurchaseOrderService;

  constructor() {
    this.service = new PurchaseOrderService();
  }

  /**
   * 모든 발주 조회
   * GET /api/purchase-orders?page=1&limit=15&search=검색어
   */
  getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      // 유효성 검사
      if (page !== undefined && (isNaN(page) || page < 1)) {
        return res.status(400).json({
          success: false,
          error: 'page는 1 이상의 정수여야 합니다.',
        });
      }
      if (limit !== undefined && (isNaN(limit) || limit < 1)) {
        return res.status(400).json({
          success: false,
          error: 'limit는 1 이상의 정수여야 합니다.',
        });
      }

      const result = await this.service.getAllPurchaseOrders(searchTerm, page, limit);
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('발주 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 목록을 불러오는데 실패했습니다.',
      });
    }
  };

  /**
   * 미출고 수량이 있는 발주 목록 조회
   * GET /api/purchase-orders/unshipped?page=1&limit=20&search=검색어
   */
  getPurchaseOrdersWithUnshipped = async (req: Request, res: Response) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      // 유효성 검사
      if (page !== undefined && (isNaN(page) || page < 1)) {
        return res.status(400).json({
          success: false,
          error: 'page는 1 이상의 정수여야 합니다.',
        });
      }
      if (limit !== undefined && (isNaN(limit) || limit < 1)) {
        return res.status(400).json({
          success: false,
          error: 'limit는 1 이상의 정수여야 합니다.',
        });
      }

      const result = await this.service.getPurchaseOrdersWithUnshipped(searchTerm, page, limit);
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('미출고 발주 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '미출고 발주 목록을 불러오는데 실패했습니다.',
      });
    }
  };

  /**
   * ID로 발주 조회
   * GET /api/purchase-orders/:id
   */
  getPurchaseOrderById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const purchaseOrder = await this.service.getPurchaseOrderById(id);

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          error: '발주를 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error: any) {
      console.error('발주 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주를 불러오는데 실패했습니다.',
      });
    }
  };

  /**
   * 새 발주 생성
   * POST /api/purchase-orders
   */
  createPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const {
        product_name,
        product_name_chinese,
        product_category,
        product_main_image,
        product_size,
        product_weight,
        product_packaging_size,
        product_set_count,
        product_small_pack_count,
        product_box_count,
        unit_price,
        order_unit_price,
        quantity,
        size,
        weight,
        packaging,
        order_date,
        estimated_shipment_date,
        testImageUrl, // 부자재 테스트 이미지 URL (선택적)
      } = req.body;

      // 유효성 검사
      if (!product_name || product_name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '상품명은 필수입니다.',
        });
      }
      if (!unit_price || unit_price <= 0) {
        return res.status(400).json({
          success: false,
          error: '단가는 0보다 큰 값이어야 합니다.',
        });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: '수량은 1 이상이어야 합니다.',
        });
      }

      const createData: CreatePurchaseOrderDTO = {
        product_name: product_name.trim(),
        product_name_chinese: product_name_chinese?.trim() || undefined,
        product_category: product_category || '봉제',
        product_main_image: product_main_image || undefined,
        product_size: product_size || undefined,
        product_weight: product_weight || undefined,
        product_packaging_size: product_packaging_size || undefined,
        product_set_count: product_set_count ? Number(product_set_count) : undefined,
        product_small_pack_count: product_small_pack_count ? Number(product_small_pack_count) : undefined,
        product_box_count: product_box_count ? Number(product_box_count) : undefined,
        unit_price: Number(unit_price),
        order_unit_price: order_unit_price ? Number(order_unit_price) : undefined,
        quantity: Number(quantity),
        size: size || undefined,
        weight: weight || undefined,
        packaging: packaging ? Number(packaging) : undefined,
        order_date: order_date || undefined,
        estimated_shipment_date: estimated_shipment_date || undefined,
        created_by: (req as any).user?.id || undefined,
      };

      const purchaseOrder = await this.service.createPurchaseOrder(createData);

      // 부자재 테스트 이미지가 있는 경우, 발주 메인 이미지로 복사
      if (testImageUrl && purchaseOrder.id) {
        try {
          const { copyMaterialTestImageToPOMainImage, getPOImageUrl } = await import('../utils/upload.js');
          const copiedMainImageRelativePath = await copyMaterialTestImageToPOMainImage(
            testImageUrl,
            purchaseOrder.id
          );
          const newMainImageUrl = getPOImageUrl(copiedMainImageRelativePath);
          
          // 발주의 메인 이미지 URL 업데이트
          await this.service.updatePurchaseOrder(purchaseOrder.id, {
            product_main_image: newMainImageUrl,
            updated_by: (req as any).user?.id,
          });

          // 업데이트된 발주 정보 다시 조회
          const updatedPurchaseOrder = await this.service.getPurchaseOrderById(purchaseOrder.id);
          return res.status(201).json({
            success: true,
            data: updatedPurchaseOrder,
          });
        } catch (error: any) {
          console.error(`부자재 테스트 이미지 복사 실패: ${testImageUrl}`, error);
          // 이미지 복사 실패해도 발주는 생성되었으므로 계속 진행 (경고만 출력)
        }
      }

      res.status(201).json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error: any) {
      console.error('발주 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 생성에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 수정
   * PUT /api/purchase-orders/:id
   */
  updatePurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const userId = user?.id;

      // 비용 관련 필드 변경 시 허용 사용자만 가능 (venpus 등)
      const costFields = ['unit_price', 'back_margin', 'quantity', 'commission_type', 'commission_rate', 'shipping_cost', 'warehouse_shipping_cost', 'advance_payment_rate'];
      const hasCostFieldChange = costFields.some((key) => req.body[key] !== undefined);
      if (hasCostFieldChange && !isCostInputAllowed(userId)) {
        return res.status(403).json({
          success: false,
          error: '비용 입력 권한이 없습니다. (허용 사용자: 성수현)',
        });
      }

      const updateData: UpdatePurchaseOrderDTO = {
        ...req.body,
        updated_by: userId || undefined,
      };

      const purchaseOrder = await this.service.updatePurchaseOrder(id, updateData);

      res.json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error: any) {
      console.error('발주 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 수정에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 재주문
   * POST /api/purchase-orders/:id/reorder
   */
  reorderPurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { quantity, unit_price, order_date, estimated_shipment_date } = req.body;

      // 유효성 검사
      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: '수량은 필수이며 0보다 커야 합니다.',
        });
      }

      if (unit_price !== undefined && (typeof unit_price !== 'number' || unit_price <= 0)) {
        return res.status(400).json({
          success: false,
          error: '단가는 0보다 큰 숫자여야 합니다.',
        });
      }

      const reorderData = {
        quantity,
        unit_price: unit_price !== undefined ? unit_price : undefined,
        order_date: order_date || undefined,
        estimated_shipment_date: estimated_shipment_date || undefined,
      };

      const newOrder = await this.service.reorderPurchaseOrder(
        id,
        reorderData,
        (req as any).user?.id || undefined
      );

      res.status(201).json({
        success: true,
        data: newOrder,
        message: '재주문이 성공적으로 생성되었습니다.',
      });
    } catch (error: any) {
      console.error('발주 재주문 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 재주문에 실패했습니다.',
      });
    }
  };

  /**
   * 일괄 컨펌
   * POST /api/purchase-orders/batch/confirm
   */
  batchConfirmPurchaseOrders = async (req: Request, res: Response) => {
    try {
      const { orderIds } = req.body;

      // 유효성 검사
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '발주 ID 배열이 필요합니다.',
        });
      }

      await this.service.batchConfirmPurchaseOrders(
        orderIds,
        (req as any).user?.id || undefined
      );

      res.json({
        success: true,
        message: `${orderIds.length}개의 발주가 컨펌되었습니다.`,
      });
    } catch (error: any) {
      console.error('일괄 컨펌 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '일괄 컨펌에 실패했습니다.',
      });
    }
  };

  /**
   * 일괄 컨펌 해제
   * POST /api/purchase-orders/batch/unconfirm
   */
  batchUnconfirmPurchaseOrders = async (req: Request, res: Response) => {
    try {
      const { orderIds } = req.body;

      // 유효성 검사
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '발주 ID 배열이 필요합니다.',
        });
      }

      await this.service.batchUnconfirmPurchaseOrders(
        orderIds,
        (req as any).user?.id || undefined
      );

      res.json({
        success: true,
        message: `${orderIds.length}개의 발주 컨펌이 해제되었습니다.`,
      });
    } catch (error: any) {
      console.error('일괄 컨펌 해제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '일괄 컨펌 해제에 실패했습니다.',
      });
    }
  };

  /**
   * 일괄 삭제
   * DELETE /api/purchase-orders/batch/delete
   */
  batchDeletePurchaseOrders = async (req: Request, res: Response) => {
    try {
      const { orderIds } = req.body;

      // 유효성 검사
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '발주 ID 배열이 필요합니다.',
        });
      }

      // 권한 확인 (A 레벨 관리자만 삭제 가능)
      const user = (req as any).user;
      if (!user || user.level !== 'A-SuperAdmin') {
        return res.status(403).json({
          success: false,
          error: '발주 삭제 권한이 없습니다.',
        });
      }

      await this.service.batchDeletePurchaseOrders(orderIds);

      res.json({
        success: true,
        message: `${orderIds.length}개의 발주가 삭제되었습니다.`,
      });
    } catch (error: any) {
      console.error('일괄 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '일괄 삭제에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 삭제
   * DELETE /api/purchase-orders/:id
   */
  deletePurchaseOrder = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deletePurchaseOrder(id);

      res.json({
        success: true,
        message: '발주가 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('발주 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 삭제에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 비용 항목 조회
   * GET /api/purchase-orders/:id/cost-items
   */
  getCostItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const costItems = await this.service.getCostItemsByPoId(id);

      res.json({
        success: true,
        data: costItems,
      });
    } catch (error: any) {
      console.error('비용 항목 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '비용 항목 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 비용 항목 저장
   * PUT /api/purchase-orders/:id/cost-items
   */
  saveCostItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items, userLevel } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          error: 'items는 배열이어야 합니다.',
        });
      }

      // 현재 사용자 권한 확인 (A 레벨 관리자 여부)
      // req.user가 없는 경우 클라이언트에서 전송한 userLevel 사용
      const user = (req as any).user;
      const userId = user?.id;
      const isAdminLevelA = user?.level === 'A-SuperAdmin' || userLevel === 'A-SuperAdmin';

      // 비용 입력 허용 사용자가 아니면 일반 항목(비 A레벨) 변경 불가 → 기존 일반 항목 유지 후 저장
      let itemsToSave = items;
      if (!isCostInputAllowed(userId)) {
        const existingItems = await this.service.getCostItemsByPoId(id);
        const existingNonAdmin = existingItems
          .filter((i) => !i.is_admin_only)
          .map((i) => ({
            item_type: i.item_type,
            name: i.name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            is_admin_only: false,
            display_order: i.display_order,
          }));
        const requestAdminOnly = items.filter((it: { is_admin_only?: boolean }) => it.is_admin_only === true);
        itemsToSave = [...existingNonAdmin, ...requestAdminOnly];
      }

      console.log('[purchaseOrderController.saveCostItems] 사용자 정보:', {
        userId: user?.id,
        userLevel: user?.level,
        isAdminLevelA,
        itemsCount: items.length,
      });

      // 유효성 검사
      for (const item of itemsToSave) {
        if (!item.item_type || !['option', 'labor'].includes(item.item_type)) {
          return res.status(400).json({
            success: false,
            error: '각 항목의 item_type은 "option" 또는 "labor"여야 합니다.',
          });
        }
        if (!item.name || typeof item.name !== 'string') {
          return res.status(400).json({
            success: false,
            error: '각 항목의 name은 필수입니다.',
          });
        }
        if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
          return res.status(400).json({
            success: false,
            error: '각 항목의 unit_price는 0 이상의 숫자여야 합니다.',
          });
        }
        if (typeof item.quantity !== 'number' || item.quantity < 0) {
          return res.status(400).json({
            success: false,
            error: '각 항목의 quantity는 0 이상의 숫자여야 합니다.',
          });
        }
        
        // A 레벨 관리자가 아닌 경우 is_admin_only가 true인 항목 저장 불가
        if (item.is_admin_only === true && !isAdminLevelA) {
          console.log('[purchaseOrderController.saveCostItems] 에러: A 레벨 관리자가 아닌데 is_admin_only=true인 항목 발견:', {
            itemName: item.name,
            itemType: item.item_type,
            is_admin_only: item.is_admin_only,
            userLevel: user?.level,
            isAdminLevelA
          });
          return res.status(403).json({
            success: false,
            error: 'A 레벨 관리자만 전용 항목을 저장할 수 있습니다.',
          });
        }
      }
      
      console.log('[purchaseOrderController.saveCostItems] 검증 통과, 저장 진행');

      // A 레벨이 아닌 관리자가 저장할 때는 기존 A 레벨 전용 항목을 유지
      const preserveAdminOnlyItems = !isAdminLevelA;
      
      await this.service.saveCostItems(id, itemsToSave, preserveAdminOnlyItems);

      res.json({
        success: true,
        message: '비용 항목이 저장되었습니다.',
      });
    } catch (error: any) {
      console.error('비용 항목 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '비용 항목 저장에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 업체 출고 항목 조회
   * GET /api/purchase-orders/:id/factory-shipments
   */
  getFactoryShipments = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const shipments = await this.service.getFactoryShipmentsByPoId(id);

      res.json({
        success: true,
        data: shipments,
      });
    } catch (error: any) {
      console.error('업체 출고 항목 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '업체 출고 항목 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 업체 출고 항목 저장
   * PUT /api/purchase-orders/:id/factory-shipments
   */
  saveFactoryShipments = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { shipments } = req.body;

      if (!Array.isArray(shipments)) {
        return res.status(400).json({
          success: false,
          error: 'shipments는 배열이어야 합니다.',
        });
      }

      // 유효성 검사
      for (const shipment of shipments) {
        if (typeof shipment.quantity !== 'number' || shipment.quantity < 0) {
          return res.status(400).json({
            success: false,
            error: '각 출고 항목의 quantity는 0 이상의 숫자여야 합니다.',
          });
        }
      }

      const insertedIds = await this.service.saveFactoryShipments(id, shipments);

      res.json({
        success: true,
        message: '업체 출고 항목이 저장되었습니다.',
        data: insertedIds, // 저장된 ID 배열 반환
      });
    } catch (error: any) {
      console.error('업체 출고 항목 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '업체 출고 항목 저장에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 반품/교환 항목 조회
   * GET /api/purchase-orders/:id/return-exchanges
   */
  getReturnExchanges = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await this.service.getReturnExchangesByPoId(id);

      res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      console.error('반품/교환 항목 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '반품/교환 항목 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 반품/교환 항목 저장
   * PUT /api/purchase-orders/:id/return-exchanges
   */
  saveReturnExchanges = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          error: 'items는 배열이어야 합니다.',
        });
      }

      // 유효성 검사
      for (const item of items) {
        if (typeof item.quantity !== 'number' || item.quantity < 0) {
          return res.status(400).json({
            success: false,
            error: '각 반품/교환 항목의 quantity는 0 이상의 숫자여야 합니다.',
          });
        }
      }

      const insertedIds = await this.service.saveReturnExchanges(id, items);

      res.json({
        success: true,
        message: '반품/교환 항목이 저장되었습니다.',
        data: insertedIds, // 저장된 ID 배열 반환
      });
    } catch (error: any) {
      console.error('반품/교환 항목 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '반품/교환 항목 저장에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 작업 항목 조회
   * GET /api/purchase-orders/:id/work-items
   */
  getWorkItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const items = await this.service.getWorkItemsByPoId(id);

      res.json({
        success: true,
        data: items,
      });
    } catch (error: any) {
      console.error('작업 항목 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '작업 항목 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 작업 항목 저장
   * PUT /api/purchase-orders/:id/work-items
   */
  saveWorkItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          error: 'items는 배열이어야 합니다.',
        });
      }

      const savedIds = await this.service.saveWorkItems(id, items);

      res.json({
        success: true,
        message: '작업 항목이 저장되었습니다.',
        data: savedIds, // 저장된 ID 배열 반환
      });
    } catch (error: any) {
      console.error('작업 항목 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '작업 항목 저장에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 배송 세트 조회
   * GET /api/purchase-orders/:id/delivery-sets
   */
  getDeliverySets = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sets = await this.service.getDeliverySetsByPoId(id);

      res.json({
        success: true,
        data: sets,
      });
    } catch (error: any) {
      console.error('배송 세트 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '배송 세트 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 배송 세트 저장
   * PUT /api/purchase-orders/:id/delivery-sets
   */
  saveDeliverySets = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { sets } = req.body;

      if (!Array.isArray(sets)) {
        return res.status(400).json({
          success: false,
          error: 'sets는 배열이어야 합니다.',
        });
      }

      // 기본 검증
      for (const set of sets) {
        if (!set.packing_code || typeof set.packing_code !== 'string') {
          return res.status(400).json({
            success: false,
            error: '각 배송 세트는 packing_code가 필요합니다.',
          });
        }
      }

      const savedIds = await this.service.saveDeliverySets(id, sets);

      res.json({
        success: true,
        message: '배송 세트가 저장되었습니다.',
        data: savedIds, // 저장된 ID 배열 반환
      });
    } catch (error: any) {
      console.error('배송 세트 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '배송 세트 저장에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 이미지 조회
   * GET /api/purchase-orders/:id/images/:type?relatedId=?
   */
  getImages = async (req: Request, res: Response) => {
    try {
      const { id, type } = req.params;
      const relatedId = req.query.relatedId ? parseInt(req.query.relatedId as string) : undefined;

      if (!['factory_shipment', 'return_exchange', 'work_item', 'logistics_info', 'logistics', 'other'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 이미지 타입입니다.',
        });
      }

      // 'logistics_info'를 'logistics'로 변환 (DB에서는 'logistics' 사용)
      const dbImageType = type === 'logistics_info' ? 'logistics' : type;

      const images = await this.service.getImagesByPoIdAndType(
        id,
        dbImageType as 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
        relatedId
      );

      res.json({
        success: true,
        data: images,
      });
    } catch (error: any) {
      console.error('발주 이미지 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '발주 이미지 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 이미지 업로드 및 저장
   * POST /api/purchase-orders/:id/images/:type/:relatedId
   */
  uploadImages = async (req: Request, res: Response) => {
    try {
      const { id, type, relatedId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      console.log(`[uploadImages] 요청 받음: purchaseOrderId=${id}, type=${type}, relatedId=${relatedId}, files=${files?.length || 0}개`);

      if (!files || files.length === 0) {
        console.error(`[uploadImages] 파일이 없습니다.`);
        return res.status(400).json({
          success: false,
          error: '업로드할 이미지 파일이 없습니다.',
        });
      }

      if (!['factory_shipment', 'return_exchange', 'work_item', 'logistics_info', 'logistics', 'other'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 이미지 타입입니다.',
        });
      }

      const parsedRelatedId = parseInt(relatedId);
      if (isNaN(parsedRelatedId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 related_id입니다.',
        });
      }

      // MySQL INT 범위 체크: -2,147,483,648 ~ 2,147,483,647
      const MAX_INT = 2147483647;
      const MIN_INT = -2147483648;
      if (parsedRelatedId > MAX_INT || parsedRelatedId < MIN_INT) {
        return res.status(400).json({
          success: false,
          error: 'related_id가 유효한 범위를 벗어났습니다. 항목을 먼저 저장해주세요.',
        });
      }

      // 이미지 타입 매핑 (DB enum → 폴더명)
      const imageTypeMap: Record<string, string> = {
        'factory_shipment': 'factory-shipment',
        'return_exchange': 'return-exchange',
        'work_item': 'work-item',
        'logistics_info': 'logistics-info',
        'logistics': 'logistics',
        'other': 'other'
      };
      const folderType = imageTypeMap[type];

      // 파일 업로드 및 저장
      const { moveImageToPOFolder, getNextPOImageNumber, getPOImageUrl } = await import('../utils/upload.js');
      const imageUrls: string[] = [];
      const movedFiles: string[] = [];
      let currentImageNumber = await getNextPOImageNumber(id, folderType);

      try {
        for (const file of files) {
          const ext = path.extname(file.originalname);
          const relativePath = await moveImageToPOFolder(
            file.path,
            id,
            folderType,
            currentImageNumber,
            ext
          );
          
          const imageUrl = getPOImageUrl(relativePath);
          imageUrls.push(imageUrl);
          
          const imageDir = await import('../utils/upload.js').then(m => m.getPOImageDir(id, folderType));
          const movedFilePath = path.join(imageDir, `${String(currentImageNumber).padStart(3, '0')}${ext}`);
          movedFiles.push(movedFilePath);
          
          currentImageNumber++;
        }

        // DB에 저장
        console.log(`이미지 DB 저장 시작: purchaseOrderId=${id}, type=${type}, relatedId=${parsedRelatedId}, imageUrls=${imageUrls.length}개`);
        console.log('저장할 이미지 URLs:', imageUrls);
        
        // 'logistics_info'를 'logistics'로 변환 (DB에서는 'logistics' 사용)
        const dbImageType = type === 'logistics_info' ? 'logistics' : type;
        
        const savedImageIds = await this.service.saveImages(
          id,
          dbImageType as 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
          parsedRelatedId,
          imageUrls
        );
        
        console.log(`이미지 DB 저장 완료: ${savedImageIds.length}개 이미지 저장됨, IDs:`, savedImageIds);

        // 저장 후 모든 이미지 다시 조회하여 반환 (기존 + 새로 추가된 것)
        const allImages = await this.service.getImagesByPoIdAndType(
          id,
          dbImageType as 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other',
          parsedRelatedId
        );
        console.log(`저장 후 이미지 조회 결과: ${allImages.length}개 이미지 발견`);
        const allImageUrls = allImages.map(img => img.image_url);

        res.json({
          success: true,
          data: allImageUrls,
          message: '이미지가 업로드되었습니다.',
        });
      } catch (error: any) {
        // 업로드 실패 시 이동된 파일 삭제
        for (const filePath of movedFiles) {
          try {
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath);
            }
          } catch (unlinkError) {
            console.error('파일 삭제 오류:', unlinkError);
          }
        }
        throw error;
      }
    } catch (error: any) {
      console.error('발주 이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '이미지 업로드에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 메인 이미지 업로드
   * POST /api/purchase-orders/:id/main-image
   */
  uploadMainImage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: '업로드할 이미지 파일이 없습니다.',
        });
      }

      // 발주 존재 확인
      const purchaseOrder = await this.service.getPurchaseOrderById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          error: '발주를 찾을 수 없습니다.',
        });
      }

      // 메인 이미지 저장
      const { savePOMainImage, getPOImageUrl, deletePOMainImage } = await import('../utils/upload.js');
      
      // 기존 메인 이미지 삭제
      if (purchaseOrder.product_main_image) {
        await deletePOMainImage(id);
      }

      // 새 메인 이미지 저장
      const relativePath = await savePOMainImage(file.path, id);
      const imageUrl = getPOImageUrl(relativePath);
      
      // 파일 존재 확인 및 로깅
      const { getPOImageFilePathFromUrl } = await import('../utils/upload.js');
      const filePath = getPOImageFilePathFromUrl(imageUrl);
      const fileExists = fs.existsSync(filePath);
      console.log(`[uploadMainImage] 이미지 파일 저장 확인 - 발주 ID: ${id}`);
      console.log(`[uploadMainImage] 상대 경로: ${relativePath}`);
      console.log(`[uploadMainImage] 이미지 URL: ${imageUrl}`);
      console.log(`[uploadMainImage] 파일 시스템 경로: ${filePath}`);
      console.log(`[uploadMainImage] 파일 존재 여부: ${fileExists}`);
      
      if (!fileExists) {
        console.error(`[uploadMainImage] ⚠️ 경고: 이미지 파일이 저장되지 않았습니다! 경로: ${filePath}`);
      }

      // 발주 정보 업데이트 (product_main_image 필드)
      await this.service.updatePurchaseOrder(id, {
        product_main_image: imageUrl,
        updated_by: (req as any).user?.id,
      });

      // product_id가 있고 실제 products 테이블에 존재하는 경우에만 업데이트
      if (purchaseOrder.product_id) {
        try {
          const { ProductService } = await import('../services/productService.js');
          const { ProductRepository } = await import('../repositories/productRepository.js');
          const productService = new ProductService();
          const productRepository = new ProductRepository();
          
          // product_id가 실제로 products 테이블에 존재하는지 확인
          const productExists = await productRepository.existsById(purchaseOrder.product_id);
          
          if (productExists) {
            await productService.updateProduct(
              purchaseOrder.product_id,
              {
                main_image: imageUrl,
              },
              (req as any).user?.id
            );
            console.log(`[uploadMainImage] products 테이블 업데이트 완료 - 상품 ID: ${purchaseOrder.product_id}, 이미지 URL: ${imageUrl}`);
          } else {
            console.log(`[uploadMainImage] products 테이블 업데이트 스킵 - 상품 ID가 존재하지 않음: ${purchaseOrder.product_id}`);
          }
        } catch (productError: any) {
          // products 테이블 업데이트 실패해도 발주 업데이트는 성공한 것으로 처리
          console.error(`[uploadMainImage] products 테이블 업데이트 실패 - 상품 ID: ${purchaseOrder.product_id}`, productError);
        }
      }

      console.log(`[uploadMainImage] 이미지 업로드 완료 - 발주 ID: ${id}, 이미지 URL: ${imageUrl}`);

      res.json({
        success: true,
        message: '메인 이미지가 업로드되었습니다.',
        data: {
          imageUrl: imageUrl,
        },
      });
    } catch (error: any) {
      console.error('발주 메인 이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '메인 이미지 업로드에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 이미지 삭제
   * DELETE /api/purchase-orders/images/:imageId
   */
  deleteImage = async (req: Request, res: Response) => {
    try {
      const { imageId } = req.params;
      const parsedImageId = parseInt(imageId);

      if (isNaN(parsedImageId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 이미지 ID입니다.',
        });
      }

      // 먼저 이미지 정보 조회 (파일 삭제용)
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT image_url FROM po_images WHERE id = ?',
        [parsedImageId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '이미지를 찾을 수 없습니다.',
        });
      }

      const imageUrl = rows[0].image_url;

      // DB에서 삭제
      await this.service.deleteImages([parsedImageId]);

      // 파일 삭제 (imageUrl은 /uploads/... 형식)
      // __dirname은 dist/controllers에 있으므로, ../..로 server 폴더로 이동
      const imagePath = path.join(__dirname, '../../', imageUrl);
      if (fs.existsSync(imagePath)) {
        await fs.promises.unlink(imagePath);
      }

      res.json({
        success: true,
        message: '이미지가 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('발주 이미지 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '이미지 삭제에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 메모 조회
   * GET /api/purchase-orders/:id/memos
   */
  getMemos = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const memos = await this.service.getMemos(id);

      res.json({
        success: true,
        data: memos,
      });
    } catch (error: any) {
      console.error('발주 메모 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '메모 조회에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 메모 추가
   * POST /api/purchase-orders/:id/memos
   */
  addMemo = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, userId } = req.body;
      const authenticatedUserId = (req as any).user?.id || userId;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: '메모 내용을 입력해주세요.',
        });
      }

      if (!authenticatedUserId) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.',
        });
      }

      const memoId = await this.service.addMemo(id, content.trim(), authenticatedUserId);

      res.json({
        success: true,
        data: { id: memoId },
        message: '메모가 추가되었습니다.',
      });
    } catch (error: any) {
      console.error('발주 메모 추가 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '메모 추가에 실패했습니다.',
      });
    }
  };

  /**
   * 발주 메모 삭제
   * DELETE /api/purchase-orders/:id/memos/:memoId
   */
  deleteMemo = async (req: Request, res: Response) => {
    try {
      const { memoId } = req.params;
      const parsedMemoId = parseInt(memoId);

      if (isNaN(parsedMemoId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 메모 ID입니다.',
        });
      }

      await this.service.deleteMemo(parsedMemoId);

      res.json({
        success: true,
        message: '메모가 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('발주 메모 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '메모 삭제에 실패했습니다.',
      });
    }
  };

  /**
   * 메모 댓글 추가
   * POST /api/purchase-orders/:id/memos/:memoId/replies
   */
  addMemoReply = async (req: Request, res: Response) => {
    try {
      const { memoId } = req.params;
      const { content, userId } = req.body;
      const authenticatedUserId = (req as any).user?.id || userId;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: '댓글 내용을 입력해주세요.',
        });
      }

      if (!authenticatedUserId) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.',
        });
      }

      const parsedMemoId = parseInt(memoId);
      if (isNaN(parsedMemoId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 메모 ID입니다.',
        });
      }

      const replyId = await this.service.addMemoReply(parsedMemoId, content.trim(), authenticatedUserId);

      res.json({
        success: true,
        data: { id: replyId },
        message: '댓글이 추가되었습니다.',
      });
    } catch (error: any) {
      console.error('메모 댓글 추가 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '댓글 추가에 실패했습니다.',
      });
    }
  };

  /**
   * 메모 댓글 삭제
   * DELETE /api/purchase-orders/:id/memos/:memoId/replies/:replyId
   */
  deleteMemoReply = async (req: Request, res: Response) => {
    try {
      const { replyId } = req.params;
      const parsedReplyId = parseInt(replyId);

      if (isNaN(parsedReplyId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 댓글 ID입니다.',
        });
      }

      await this.service.deleteMemoReply(parsedReplyId);

      res.json({
        success: true,
        message: '댓글이 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('메모 댓글 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '댓글 삭제에 실패했습니다.',
      });
    }
  };

  /**
   * A레벨 관리자 비용 지불 완료 상태 업데이트
   * PUT /api/purchase-orders/:id/admin-cost-paid
   */
  updateAdminCostPaid = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { admin_cost_paid } = req.body;

      if (typeof admin_cost_paid !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'admin_cost_paid는 boolean 값이어야 합니다.',
        });
      }

      const purchaseOrder = await this.service.updateAdminCostPaid(id, admin_cost_paid);

      res.json({
        success: true,
        data: purchaseOrder,
        message: 'A레벨 관리자 비용 지불 완료 상태가 업데이트되었습니다.',
      });
    } catch (error: any) {
      console.error('A레벨 관리자 비용 지불 완료 상태 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '상태 업데이트에 실패했습니다.',
      });
    }
  };

  /**
   * 한국에 도착하지 않은 물품 분석 조회
   * GET /api/purchase-orders/analysis/not-arrived
   */
  getNotArrivedAnalysis = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getNotArrivedAnalysis();

      // 날짜 필드 포맷팅 (YYYY-MM-DD 형식)
      const { formatDateToKSTString } = await import('../utils/dateUtils.js');
      const formattedItems = result.items.map(item => ({
        ...item,
        order_date: formatDateToKSTString(item.order_date),
        estimated_delivery: formatDateToKSTString(item.estimated_delivery),
      }));

      res.json({
        success: true,
        data: {
          items: formattedItems,
          summary: result.summary,
        },
      });
    } catch (error: any) {
      console.error('한국 미도착 물품 분석 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '분석 데이터 조회에 실패했습니다.',
      });
    }
  };
}

