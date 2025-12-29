import { Request, Response } from 'express';
import { MaterialService } from '../services/materialService.js';
import { CreateMaterialDTO, UpdateMaterialDTO } from '../models/material.js';

export class MaterialController {
  private service: MaterialService;

  constructor() {
    this.service = new MaterialService();
  }

  /**
   * 모든 부자재 조회
   * GET /api/materials
   */
  getAllMaterials = async (req: Request, res: Response) => {
    try {
      const materials = await this.service.getAllMaterials();
      res.json({
        success: true,
        data: materials,
      });
    } catch (error: any) {
      console.error('부자재 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '부자재 목록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 부자재 조회
   * GET /api/materials/:id
   */
  getMaterialById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const material = await this.service.getMaterialById(materialId);

      if (!material) {
        return res.status(404).json({
          success: false,
          error: '부자재를 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: material,
      });
    } catch (error: any) {
      console.error('부자재 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '부자재 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 생성 (이미지 업로드 포함)
   * POST /api/materials
   */
  createMaterial = async (req: Request, res: Response) => {
    try {
      // multer 미들웨어를 사용하여 파일 업로드 처리
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const productImageFiles = files.productImages || [];

      // 폼 데이터 파싱
      const formData = req.body;

      // 필수 필드 검증
      if (!formData.productName && !formData.productNameChinese) {
        return res.status(400).json({
          success: false,
          error: '상품명 또는 중문 상품명 중 하나는 필수입니다.',
        });
      }

      // 상품명 설정 (한국어 또는 중국어 중 하나는 필수)
      const productName = formData.productName || formData.productNameChinese || '';
      const productNameChinese = formData.productName && formData.productNameChinese ? formData.productNameChinese : undefined;

      const materialData: CreateMaterialDTO = {
        code: '', // Service에서 생성
        date: formData.date ? new Date(formData.date) : new Date(),
        productName: productName,
        productNameChinese: productNameChinese,
        category: formData.category || '포장용품',
        typeCount: formData.typeCount ? parseInt(formData.typeCount, 10) : 1,
        link: formData.link || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        purchaseComplete: formData.purchaseComplete === 'true' || formData.purchaseComplete === true,
        currentStock: formData.currentStock ? parseInt(formData.currentStock, 10) : 0,
        created_by: (req as any).user?.id,
      };

      // 부자재 생성 (이미지 파일 포함)
      const material = await this.service.createMaterial(
        materialData,
        productImageFiles,
        (req as any).user?.id
      );

      res.status(201).json({
        success: true,
        message: '부자재가 성공적으로 생성되었습니다.',
        data: material,
      });
    } catch (error: any) {
      console.error('부자재 생성 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '부자재 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 수정
   * PUT /api/materials/:id
   */
  updateMaterial = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const data: UpdateMaterialDTO = req.body;

      // purchaseComplete가 문자열로 오면 boolean으로 변환
      if (data.purchaseComplete !== undefined) {
        if (typeof data.purchaseComplete === 'string') {
          data.purchaseComplete = data.purchaseComplete === 'true';
        }
      }

      const material = await this.service.updateMaterial(
        materialId,
        data,
        (req as any).user?.id
      );

      res.json({
        success: true,
        message: '부자재가 성공적으로 수정되었습니다.',
        data: material,
      });
    } catch (error: any) {
      console.error('부자재 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '부자재 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 테스트 이미지 업로드
   * POST /api/materials/:id/test-images
   */
  uploadTestImages = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const files = req.files as Express.Multer.File[];
      const testImageFiles = files || [];

      const material = await this.service.uploadTestImages(materialId, testImageFiles);

      res.json({
        success: true,
        message: '테스트 이미지가 업로드되었습니다.',
        data: material,
      });
    } catch (error: any) {
      console.error('부자재 테스트 이미지 업로드 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '테스트 이미지 업로드 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 삭제
   * DELETE /api/materials/:id
   */
  deleteMaterial = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      await this.service.deleteMaterial(materialId);

      res.json({
        success: true,
        message: '부자재가 성공적으로 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('부자재 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '부자재 삭제 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 테스트 이미지 메타데이터 조회
   * GET /api/materials/:id/test-images/metadata
   */
  getTestImageMetadata = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const metadata = await this.service.getTestImageMetadata(materialId);

      res.status(200).json({
        success: true,
        data: metadata,
      });
    } catch (error: any) {
      console.error('테스트 이미지 메타데이터 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '테스트 이미지 메타데이터 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 테스트 이미지 메타데이터 업데이트
   * PUT /api/materials/:id/test-images/:imageUrl/metadata
   */
  updateTestImageMetadata = async (req: Request, res: Response) => {
    try {
      const { id, imageUrl } = req.params;
      const materialId = parseInt(id, 10);
      const decodedImageUrl = decodeURIComponent(imageUrl);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const { reaction, memo, confirmed, confirmedBy } = req.body;

      const updateData: {
        reaction?: 'like' | 'dislike' | null;
        memo?: string | null;
        confirmed?: boolean;
        confirmedBy?: string;
      } = {};

      if (reaction !== undefined) {
        updateData.reaction = reaction;
      }
      if (memo !== undefined) {
        updateData.memo = memo;
      }
      if (confirmed !== undefined) {
        updateData.confirmed = confirmed;
        if (confirmed && confirmedBy) {
          updateData.confirmedBy = confirmedBy;
        }
      }

      const metadata = await this.service.updateTestImageMetadata(materialId, decodedImageUrl, updateData);

      res.status(200).json({
        success: true,
        message: '메타데이터가 성공적으로 업데이트되었습니다.',
        data: metadata,
      });
    } catch (error: any) {
      console.error('테스트 이미지 메타데이터 업데이트 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '테스트 이미지 메타데이터 업데이트 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 입출고 기록 조회
   * GET /api/materials/:id/inventory
   */
  getInventoryTransactions = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      const transactions = await this.service.getInventoryTransactions(materialId);

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      console.error('입출고 기록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '입출고 기록 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 부자재 입출고 기록 추가
   * POST /api/materials/:id/inventory
   */
  addInventoryTransaction = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const materialId = parseInt(id, 10);
      const { transactionDate, transactionType, quantity, relatedOrder, notes } = req.body;

      if (isNaN(materialId)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 부자재 ID입니다.',
        });
      }

      // 유효성 검사
      if (!transactionDate) {
        return res.status(400).json({
          success: false,
          error: '입출고 날짜는 필수입니다.',
        });
      }

      if (!transactionType || !['in', 'out'].includes(transactionType)) {
        return res.status(400).json({
          success: false,
          error: '입출고 구분은 "in" 또는 "out"이어야 합니다.',
        });
      }

      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          error: '수량은 1 이상의 정수여야 합니다.',
        });
      }

      const result = await this.service.addInventoryTransaction(
        materialId,
        {
          transactionDate: new Date(transactionDate),
          transactionType,
          quantity: parseInt(quantity, 10),
          relatedOrder: relatedOrder || undefined,
          notes: notes || undefined,
        },
        (req as any).user?.id
      );

      res.status(201).json({
        success: true,
        message: '입출고 기록이 추가되었습니다.',
        data: {
          transaction: result.transaction,
          newStock: result.newStock,
        },
      });
    } catch (error: any) {
      console.error('입출고 기록 추가 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '입출고 기록 추가 중 오류가 발생했습니다.',
      });
    }
  };
}

