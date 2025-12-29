import path from 'path';
import { pool } from '../config/database.js';
import { MaterialRepository } from '../repositories/materialRepository.js';
import {
  Material,
  MaterialPublic,
  CreateMaterialDTO,
  UpdateMaterialDTO,
  MaterialInventoryTransaction,
  CreateInventoryTransactionDTO,
  MaterialTestImageMetadata,
  UpdateTestImageMetadataDTO,
} from '../models/material.js';
import {
  moveImageToMaterialFolder,
  getMaterialImageUrl,
  deleteMaterialImageDir,
  getNextMaterialImageNumber,
} from '../utils/upload.js';

export class MaterialService {
  private repository: MaterialRepository;

  constructor() {
    this.repository = new MaterialRepository();
  }

  /**
   * 모든 부자재 조회
   */
  async getAllMaterials(): Promise<MaterialPublic[]> {
    const materials = await this.repository.findAll();
    return Promise.all(materials.map(material => this.enrichMaterial(material)));
  }

  /**
   * ID로 부자재 조회
   */
  async getMaterialById(id: number): Promise<MaterialPublic | null> {
    const material = await this.repository.findById(id);
    if (!material) {
      return null;
    }

    return this.enrichMaterial(material);
  }

  /**
   * 부자재 생성 (이미지 파일 포함)
   */
  async createMaterial(
    data: CreateMaterialDTO,
    productImageFiles?: Express.Multer.File[],
    createdBy?: string
  ): Promise<MaterialPublic> {
    // 부자재 코드 생성
    const code = await this.repository.generateNextCode();

    // 부자재 기본 정보 생성
    const materialData: CreateMaterialDTO = {
      ...data,
      code,
      purchaseComplete: data.purchaseComplete || false,
      currentStock: data.currentStock || 0,
      created_by: createdBy,
    };

    // 부자재 생성
    const material = await this.repository.create(materialData);

    // 제품 이미지 저장
    if (productImageFiles && productImageFiles.length > 0) {
      const imageUrls: string[] = [];
      
      // 첫 번째 이미지 번호 조회
      let currentImageNumber = await getNextMaterialImageNumber(code, 'product');

      for (let i = 0; i < productImageFiles.length; i++) {
        const file = productImageFiles[i];
        const ext = path.extname(file.originalname);
        
        // 이미지 파일을 최종 경로로 이동
        const relativePath = await moveImageToMaterialFolder(
          file.path,
          code,
          'product',
          currentImageNumber + i,
          ext
        );
        
        const imageUrl = getMaterialImageUrl(relativePath);
        imageUrls.push(imageUrl);
      }

      // DB에 이미지 URL 저장
      if (imageUrls.length > 0) {
        await this.repository.saveImages(material.id, 'product', imageUrls);
      }
    }

    return this.enrichMaterial(material);
  }

  /**
   * 부자재 수정
   */
  async updateMaterial(
    id: number,
    data: UpdateMaterialDTO,
    updatedBy?: string
  ): Promise<MaterialPublic> {
    const updateData: UpdateMaterialDTO = {
      ...data,
      updated_by: updatedBy,
    };

    const material = await this.repository.update(id, updateData);
    return this.enrichMaterial(material);
  }

  /**
   * 부자재 삭제
   */
  async deleteMaterial(id: number): Promise<void> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    // 이미지 폴더 삭제
    await deleteMaterialImageDir(material.code);

    // 부자재 삭제 (CASCADE로 이미지도 함께 삭제됨)
    await this.repository.delete(id);
  }

  /**
   * 부자재 테스트 이미지 업로드
   */
  async uploadTestImages(
    materialId: number,
    testImageFiles: Express.Multer.File[]
  ): Promise<MaterialPublic> {
    const material = await this.repository.findById(materialId);
    if (!material) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    if (testImageFiles.length === 0) {
      return this.enrichMaterial(material);
    }

    const imageUrls: string[] = [];
    
    // 첫 번째 이미지 번호 조회
    let currentImageNumber = await getNextMaterialImageNumber(material.code, 'test');

    for (let i = 0; i < testImageFiles.length; i++) {
      const file = testImageFiles[i];
      const ext = path.extname(file.originalname);
      
      // 이미지 파일을 최종 경로로 이동
      const relativePath = await moveImageToMaterialFolder(
        file.path,
        material.code,
        'test',
        currentImageNumber + i,
        ext
      );
      
      const imageUrl = getMaterialImageUrl(relativePath);
      imageUrls.push(imageUrl);
    }

    // DB에 이미지 URL 추가 (기존 이미지 유지)
    if (imageUrls.length > 0) {
      await this.repository.addImages(material.id, 'test', imageUrls);
    }

    return this.enrichMaterial(material);
  }

  /**
   * 부자재에 이미지 정보 추가
   */
  private async enrichMaterial(material: Material): Promise<MaterialPublic> {
    const images = await this.repository.findImagesByMaterialId(material.id);

    const productImages = images
      .filter(img => img.image_type === 'product')
      .map(img => img.image_url);
    
    const testImages = images
      .filter(img => img.image_type === 'test')
      .map(img => img.image_url);

    return {
      ...material,
      images: {
        product: productImages,
        test: testImages,
      },
    };
  }

  /**
   * 부자재 입출고 기록 조회
   */
  async getInventoryTransactions(materialId: number): Promise<MaterialInventoryTransaction[]> {
    return this.repository.findInventoryTransactions(materialId);
  }

  /**
   * 부자재 입출고 기록 추가
   * 트랜잭션과 SELECT FOR UPDATE를 사용하여 동시성 문제 해결
   */
  async addInventoryTransaction(
    materialId: number,
    data: CreateInventoryTransactionDTO,
    createdBy?: string
  ): Promise<{ transaction: MaterialInventoryTransaction; newStock: number }> {
    // 부자재 존재 확인
    const material = await this.repository.findById(materialId);
    if (!material) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    // 트랜잭션 시작
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. 현재 재고를 SELECT FOR UPDATE로 조회 (Row-level lock)
      const currentStock = await this.repository.findCurrentStockForUpdate(connection, materialId);

      // 2. 새 재고 계산
      const quantityChange = data.transactionType === 'in' ? data.quantity : -data.quantity;
      const newStock = currentStock + quantityChange;

      // 3. 음수 재고 검증
      if (newStock < 0) {
        throw new Error('재고가 부족합니다. (현재 재고: ' + currentStock + '개)');
      }

      // 4. 입출고 기록 저장
      const transactionData: CreateInventoryTransactionDTO = {
        ...data,
        created_by: createdBy,
      };
      const transaction = await this.repository.createInventoryTransaction(connection, materialId, transactionData);

      // 5. current_stock 업데이트
      await this.repository.updateCurrentStock(connection, materialId, newStock);

      // 6. 트랜잭션 커밋
      await connection.commit();

      return { transaction, newStock };
    } catch (error: any) {
      // 트랜잭션 롤백
      await connection.rollback();
      throw error;
    } finally {
      // 연결 반환
      connection.release();
    }
  }

  /**
   * 테스트 이미지 메타데이터 조회
   */
  async getTestImageMetadata(materialId: number): Promise<MaterialTestImageMetadata[]> {
    // 부자재 존재 확인
    const material = await this.repository.findById(materialId);
    if (!material) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    return this.repository.findTestImageMetadata(materialId);
  }

  /**
   * 테스트 이미지 메타데이터 업데이트
   */
  async updateTestImageMetadata(
    materialId: number,
    imageUrl: string,
    data: UpdateTestImageMetadataDTO
  ): Promise<MaterialTestImageMetadata> {
    // 부자재 존재 확인
    const material = await this.repository.findById(materialId);
    if (!material) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    // 이미지 존재 확인 (material_images 테이블에서)
    const testImages = await this.repository.findImagesByMaterialId(materialId, 'test');
    const imageExists = testImages.some((img) => img.image_url === imageUrl);
    if (!imageExists) {
      throw new Error('테스트 이미지를 찾을 수 없습니다.');
    }

    return this.repository.upsertTestImageMetadata(materialId, imageUrl, data);
  }
}

