import { Request, Response } from 'express';
import { ShopShipmentService } from '../services/shopShipmentService.js';
import { ShopShipmentTrackingService } from '../services/shopShipmentTrackingService.js';
import { CreateShopShipmentBatchDTO, UpdateShopShipmentDTO, UpdateShopShipmentBatchDTO } from '../models/shopShipment.js';

export class ShopShipmentController {
  private service = new ShopShipmentService();
  private trackingService = new ShopShipmentTrackingService();

  listRows = async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await this.service.listRows();
      res.json({ success: true, data: rows });
    } catch (error: unknown) {
      console.error('배송 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '배송 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  listBatches = async (_req: Request, res: Response): Promise<void> => {
    try {
      const batches = await this.service.listBatches();
      res.json({ success: true, data: batches });
    } catch (error: unknown) {
      console.error('배송 묶음 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : '배송 묶음 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  listAssignedLineIds = async (_req: Request, res: Response): Promise<void> => {
    try {
      const lineIds = await this.service.listAssignedLineIds();
      res.json({ success: true, data: lineIds });
    } catch (error: unknown) {
      console.error('배송 할당 주문건 조회 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : '배송 할당 주문건 조회 중 오류가 발생했습니다.',
      });
    }
  };

  createBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as CreateShopShipmentBatchDTO;
      const result = await this.service.createBatch(body);
      res.status(201).json({
        success: true,
        data: result,
        message: '송장이 등록되었습니다.',
      });
    } catch (error: unknown) {
      console.error('송장 등록 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '송장 등록 중 오류가 발생했습니다.',
      });
    }
  };

  updateShipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateShopShipmentDTO = {
        shipmentBoxCount:
          req.body?.shipmentBoxCount !== undefined ? Number(req.body.shipmentBoxCount) : undefined,
        deliveryFee:
          req.body?.deliveryFee !== undefined ? Number(req.body.deliveryFee) : undefined,
        boxPrice: req.body?.boxPrice !== undefined ? Number(req.body.boxPrice) : undefined,
      };
      const shipment = await this.service.updateShipment(req.params.id, data);
      res.json({ success: true, data: shipment, message: '송장 정보가 저장되었습니다.' });
    } catch (error: unknown) {
      console.error('송장 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '송장 수정 중 오류가 발생했습니다.',
      });
    }
  };

  updateBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateShopShipmentBatchDTO = {
        shipmentBoxCount:
          req.body?.shipmentBoxCount !== undefined ? Number(req.body.shipmentBoxCount) : undefined,
        deliveryFee:
          req.body?.deliveryFee !== undefined ? Number(req.body.deliveryFee) : undefined,
        boxPrice: req.body?.boxPrice !== undefined ? Number(req.body.boxPrice) : undefined,
        logisticsFeePaid:
          req.body?.logisticsFeePaid !== undefined ? Boolean(req.body.logisticsFeePaid) : undefined,
      };
      await this.service.updateBatch(req.params.id, data);
      res.json({ success: true, message: '배송 정보가 저장되었습니다.' });
    } catch (error: unknown) {
      console.error('배송 묶음 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '배송 정보 저장 중 오류가 발생했습니다.',
      });
    }
  };

  lookupTracking = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.trackingService.lookupAndUpdate(req.params.id);
      res.json({ success: true, data: result, message: '배송 상태를 갱신했습니다.' });
    } catch (error: unknown) {
      console.error('쇼핑몰 배송 조회 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '배송 조회 중 오류가 발생했습니다.',
      });
    }
  };

  deleteShipment = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.deleteShipment(req.params.id);
      res.json({ success: true, message: '송장이 삭제되었습니다.' });
    } catch (error: unknown) {
      console.error('송장 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '송장 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  deleteBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.deleteBatch(req.params.id);
      res.json({ success: true, message: '배송 묶음이 삭제되었습니다.' });
    } catch (error: unknown) {
      console.error('배송 묶음 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '배송 묶음 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}
