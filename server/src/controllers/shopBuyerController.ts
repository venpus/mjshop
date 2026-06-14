import { Request, Response } from 'express';
import { ShopBuyerService } from '../services/shopBuyerService.js';
import { CreateShopBuyerDTO, UpdateShopBuyerDTO } from '../models/shopBuyer.js';

function mapAddressesFromBody(body: unknown): CreateShopBuyerDTO['addresses'] {
  if (!Array.isArray(body)) return [];
  return body.map((item: Record<string, unknown>, index: number) => ({
    id: item.id != null ? Number(item.id) : undefined,
    address: String(item.address ?? ''),
    recipientName: String(item.recipientName ?? ''),
    phoneNumber: String(item.phoneNumber ?? ''),
    sortOrder: item.sortOrder != null ? Number(item.sortOrder) : index,
  }));
}

export class ShopBuyerController {
  private service: ShopBuyerService;

  constructor() {
    this.service = new ShopBuyerService();
  }

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const buyers = await this.service.getAllBuyers();
      res.json({ success: true, data: buyers });
    } catch (error: unknown) {
      console.error('구매자 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '구매자 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const buyer = await this.service.getBuyerById(Number(req.params.id));
      if (!buyer) {
        res.status(404).json({ success: false, error: '구매자를 찾을 수 없습니다.' });
        return;
      }
      res.json({ success: true, data: buyer });
    } catch (error: unknown) {
      console.error('구매자 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '구매자 조회 중 오류가 발생했습니다.',
      });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateShopBuyerDTO = {
        companyName: req.body.companyName,
        kakaoId: req.body.kakaoId,
        businessRegistrationNumber: req.body.businessRegistrationNumber,
        addresses: mapAddressesFromBody(req.body.addresses),
        createdBy: (req as Request & { user?: { id?: string } }).user?.id,
      };

      const buyer = await this.service.createBuyer(data);
      res.status(201).json({ success: true, data: buyer });
    } catch (error: unknown) {
      console.error('구매자 등록 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '구매자 등록 중 오류가 발생했습니다.',
      });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateShopBuyerDTO = {
        companyName: req.body.companyName,
        kakaoId: req.body.kakaoId,
        businessRegistrationNumber: req.body.businessRegistrationNumber,
        addresses: req.body.addresses !== undefined ? mapAddressesFromBody(req.body.addresses) : undefined,
        updatedBy: (req as Request & { user?: { id?: string } }).user?.id,
      };

      const buyer = await this.service.updateBuyer(Number(req.params.id), data);
      res.json({ success: true, data: buyer });
    } catch (error: unknown) {
      console.error('구매자 수정 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '구매자 수정 중 오류가 발생했습니다.',
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.service.deleteBuyer(Number(req.params.id));
      res.json({ success: true, message: '구매자가 삭제되었습니다.' });
    } catch (error: unknown) {
      console.error('구매자 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '구매자 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  uploadBusinessRegistrationImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: '업로드할 이미지 파일이 없습니다.' });
        return;
      }

      const buyer = await this.service.uploadBusinessRegistrationImage(
        Number(req.params.id),
        file.path
      );
      res.json({
        success: true,
        message: '사업자등록증 이미지가 업로드되었습니다.',
        data: buyer,
      });
    } catch (error: unknown) {
      console.error('사업자등록증 이미지 업로드 오류:', error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : '사업자등록증 이미지 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  deleteBusinessRegistrationImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const buyer = await this.service.removeBusinessRegistrationImage(Number(req.params.id));
      res.json({
        success: true,
        message: '사업자등록증 이미지가 삭제되었습니다.',
        data: buyer,
      });
    } catch (error: unknown) {
      console.error('사업자등록증 이미지 삭제 오류:', error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : '사업자등록증 이미지 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}
