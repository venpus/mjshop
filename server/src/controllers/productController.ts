import { Request, Response } from 'express';
import { ProductService } from '../services/productService.js';
import { ProductRepository } from '../repositories/productRepository.js';
import {
  CreateProductDTO,
  UpdateProductDTO,
} from '../models/product.js';
import { 
  getImageUrl, 
  createProductImageDir,
  getNextImageNumber,
  moveImageToProductFolder,
  getProductImageDir
} from '../utils/upload.js';
import { pool } from '../config/database.js';
import path from 'path';
import fs from 'fs';

export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  /**
   * 모든 상품 조회
   * GET /api/products
   */
  getAllProducts = async (req: Request, res: Response) => {
    try {
      const products = await this.service.getAllProducts();
      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('상품 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '상품 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 공급상 검색 (자동완성용)
   * GET /api/products/suppliers/search?q=검색어
   */
  searchSuppliers = async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: '검색어가 필요합니다.',
        });
      }

      const repository = new ProductRepository();
      const suppliers = await repository.searchSuppliersByName(q.trim(), 10);

      res.json({
        success: true,
        data: suppliers,
      });
    } catch (error: any) {
      console.error('공급상 검색 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '공급상 검색 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * ID로 상품 조회
   * GET /api/products/:id
   */
  getProductById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await this.service.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다.',
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('상품 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '상품 조회 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 상품 생성 (이미지 업로드 포함)
   * POST /api/products
   */
  createProduct = async (req: Request, res: Response) => {
    try {
      // multer 미들웨어를 사용하여 파일 업로드 처리
      // upload.fields()를 사용하면 req.files는 객체 형태로 반환됨
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mainImageFile = files.mainImage?.[0]; // mainImage 필드의 첫 번째 파일
      const infoImageFiles = files.infoImages || []; // infoImages 필드의 모든 파일

      // 폼 데이터 파싱
      const formData = req.body;
      
      // 공급상 정보 처리 (이름과 URL이 있으면 suppliers 테이블에서 찾거나 생성)
      let supplierId: number | undefined = undefined;
      if (formData.supplierName) {
        const repository = new ProductRepository();
        let supplier = await repository.findSupplierByName(formData.supplierName);
        if (!supplier) {
          // 공급상이 없으면 새로 생성
          supplierId = await repository.createSupplier(
            formData.supplierName,
            formData.supplierUrl || null
          );
        } else {
          // 기존 공급상이 있으면 ID 사용
          supplierId = supplier.id;
          // URL이 변경되었으면 업데이트 (선택사항)
          if (formData.supplierUrl && supplier.url !== formData.supplierUrl) {
            await pool.execute(
              'UPDATE suppliers SET url = ? WHERE id = ?',
              [formData.supplierUrl, supplier.id]
            );
          }
        }
      }
      
      const productData: CreateProductDTO = {
        name: formData.name,
        name_chinese: formData.nameChinese || undefined,
        category: formData.category,
        price: parseFloat(formData.price),
        size: formData.size || undefined,
        packaging_size: formData.packagingSize || undefined,
        weight: formData.weight || undefined,
        set_count: formData.setCount ? parseInt(formData.setCount) : undefined,
        small_pack_count: formData.smallPackCount ? parseInt(formData.smallPackCount) : undefined,
        box_count: formData.boxCount ? parseInt(formData.boxCount) : undefined,
        supplier_id: supplierId,
        created_by: formData.createdBy || undefined,
      };

      // 1. 상품 생성 (상품 ID 획득)
      const product = await this.service.createProduct(productData);

      // 2. 상품코드 폴더 생성
      await createProductImageDir(product.id);

      // 3. 다음 이미지 번호 조회 (빈 번호 허용, 재정렬 안 함)
      let currentImageNumber = await getNextImageNumber(product.id);

      // 4. 이미지 파일 처리
      const imageUrls: string[] = [];
      const movedFiles: string[] = []; // 이동된 파일 경로 (에러 발생 시 정리용)

      try {
        // 메인 이미지 저장
        if (mainImageFile) {
          const ext = path.extname(mainImageFile.originalname);
          const relativePath = await moveImageToProductFolder(
            mainImageFile.path,
            product.id,
            currentImageNumber,
            ext
          );
          
          // 이동된 파일의 실제 경로 저장 (에러 발생 시 정리용)
          const productDir = getProductImageDir(product.id);
          const movedFilePath = path.join(productDir, `${String(currentImageNumber).padStart(3, '0')}${ext}`);
          movedFiles.push(movedFilePath);
          
          const mainImageUrl = getImageUrl(relativePath);
          imageUrls.push(mainImageUrl);
          currentImageNumber++;
          
          // 메인 이미지를 products 테이블에 저장
          await this.service.updateProduct(product.id, {
            main_image: mainImageUrl,
          });
        }

        // 추가 이미지 저장 (순차적으로 번호 증가)
        for (const file of infoImageFiles) {
          const ext = path.extname(file.originalname);
          const relativePath = await moveImageToProductFolder(
            file.path,
            product.id,
            currentImageNumber,
            ext
          );
          
          // 이동된 파일의 실제 경로 저장 (에러 발생 시 정리용)
          const productDir = getProductImageDir(product.id);
          const movedFilePath = path.join(productDir, `${String(currentImageNumber).padStart(3, '0')}${ext}`);
          movedFiles.push(movedFilePath);
          
          const imageUrl = getImageUrl(relativePath);
          imageUrls.push(imageUrl);
          currentImageNumber++;
        }

        // 5. 모든 이미지를 product_images 테이블에 저장
        if (imageUrls.length > 0) {
          await this.service.saveProductImages(product.id, imageUrls);
        }
      } catch (error) {
        // 에러 발생 시 이동된 파일들 정리
        for (const filePath of movedFiles) {
          try {
            if (fs.existsSync(filePath)) {
              await fs.promises.unlink(filePath);
            }
          } catch (unlinkError) {
            console.error(`파일 삭제 실패: ${filePath}`, unlinkError);
          }
        }
        throw error;
      }

      // 최종 상품 정보 조회
      const finalProduct = await this.service.getProductById(product.id);

      res.status(201).json({
        success: true,
        data: finalProduct,
      });
    } catch (error: any) {
      console.error('상품 생성 오류:', error);
      
      // 임시 파일 정리 (파일 이동이 실패한 경우)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        // 모든 필드의 파일들을 평탄화하여 처리
        Object.values(files).flat().forEach((file) => {
          try {
            // 파일이 아직 임시 위치에 있을 수 있음
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (unlinkError) {
            console.error(`임시 파일 삭제 실패: ${file.path}`, unlinkError);
          }
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || '상품 생성 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 상품 수정
   * PUT /api/products/:id
   */
  updateProduct = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const mainImageFile = files?.mainImage?.[0];
      const infoImageFiles = files?.infoImages || [];
      const formData = req.body;

      // 공급상 정보 처리
      let supplierId: number | undefined = undefined;
      if (formData.supplierName) {
        const repository = new ProductRepository();
        let supplier = await repository.findSupplierByName(formData.supplierName);
        if (!supplier) {
          supplierId = await repository.createSupplier(
            formData.supplierName,
            formData.supplierUrl || null
          );
        } else {
          supplierId = supplier.id;
          if (formData.supplierUrl && supplier.url !== formData.supplierUrl) {
            await pool.execute(
              'UPDATE suppliers SET url = ? WHERE id = ?',
              [formData.supplierUrl, supplier.id]
            );
          }
        }
      }

      // 상품 기본 정보 업데이트
      const productData: UpdateProductDTO = {
        name: formData.name,
        name_chinese: formData.nameChinese || undefined,
        category: formData.category,
        price: formData.price ? parseFloat(formData.price) : undefined,
        size: formData.size || undefined,
        packaging_size: formData.packagingSize || undefined,
        weight: formData.weight || undefined,
        set_count: formData.setCount ? parseInt(formData.setCount) : undefined,
        small_pack_count: formData.smallPackCount ? parseInt(formData.smallPackCount) : undefined,
        box_count: formData.boxCount ? parseInt(formData.boxCount) : undefined,
        supplier_id: supplierId,
        updated_by: formData.updatedBy || undefined,
      };

      // 1. 상품 기본 정보 업데이트
      let product = await this.service.updateProduct(id, productData);

      // 2. 기존 이미지 관리
      // 기존 상품 정보 가져오기 (이미지 포함) - 업데이트 전 상태
      const existingProductBeforeUpdate = await this.service.getProductById(id);
      if (!existingProductBeforeUpdate) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다.'
        });
      }
      const existingImages = existingProductBeforeUpdate.images || [];
      
      // 유지할 기존 이미지 URL 목록 (클라이언트에서 전송한 것)
      // FormData에서 배열은 JSON 문자열로 변환되어 전송됨
      const keepMainImageUrl = formData.existingMainImageUrl;
      let keepInfoImageUrls: string[] = [];
      
      if (formData.existingInfoImageUrls) {
        if (typeof formData.existingInfoImageUrls === 'string') {
          // JSON 문자열인 경우 파싱
          try {
            keepInfoImageUrls = JSON.parse(formData.existingInfoImageUrls);
          } catch (e) {
            // JSON 파싱 실패 시 문자열 배열로 처리
            keepInfoImageUrls = [formData.existingInfoImageUrls];
          }
        } else if (Array.isArray(formData.existingInfoImageUrls)) {
          keepInfoImageUrls = formData.existingInfoImageUrls;
        }
      }
      
      console.log('🔍 [이미지 관리] 기존 이미지:', existingImages);
      console.log('🔍 [이미지 관리] 유지할 메인 이미지:', keepMainImageUrl);
      console.log('🔍 [이미지 관리] 유지할 정보 이미지:', keepInfoImageUrls);

      // 삭제할 이미지 찾기 (기존 이미지 중 유지 목록에 없는 것)
      const imagesToDelete = existingImages.filter(img => {
        // 기존 메인 이미지인 경우
        if (img === existingProductBeforeUpdate.main_image) {
          // 새 메인 이미지를 업로드하면 기존 메인 이미지 삭제
          // 또는 기존 메인 이미지를 유지하지 않으면 삭제
          return mainImageFile !== undefined || !keepMainImageUrl || img !== keepMainImageUrl;
        }
        // 정보 이미지인 경우 - 유지 목록에 없으면 삭제
        // URL 비교 시 전체 URL과 상대 경로 모두 고려
        const isInKeepList = keepInfoImageUrls.some(keepUrl => {
          // 전체 URL과 상대 경로 모두 비교
          return keepUrl === img || keepUrl.endsWith(img) || img.endsWith(keepUrl);
        });
        return !isInKeepList;
      });

      console.log('🗑️ [이미지 관리] 삭제할 이미지:', imagesToDelete);

      // 삭제할 이미지 제거
      if (imagesToDelete.length > 0) {
        await this.service.deleteProductImages(id, imagesToDelete);
      }
      
      // 새 메인 이미지 업로드 시, 기존 메인 이미지가 product_images에 있다면 삭제
      // (이미 위에서 삭제될 수도 있지만, 확실하게 처리)
      if (mainImageFile && existingProductBeforeUpdate.main_image) {
        // 기존 메인 이미지가 product_images 테이블에 있는지 확인하고 삭제
        const repository = new ProductRepository();
        await repository.deleteImages(id, [existingProductBeforeUpdate.main_image]);
      }

      // 3. 새로 업로드한 이미지 처리
      if (mainImageFile || infoImageFiles.length > 0) {
        await createProductImageDir(id);
        let currentImageNumber = await getNextImageNumber(id);
        const newImageUrls: string[] = [];
        const movedFiles: string[] = [];

        try {
          // 메인 이미지 저장
          if (mainImageFile) {
            const ext = path.extname(mainImageFile.originalname);
            const relativePath = await moveImageToProductFolder(
              mainImageFile.path,
              id,
              currentImageNumber,
              ext
            );
            
            const productDir = getProductImageDir(id);
            const movedFilePath = path.join(productDir, `${String(currentImageNumber).padStart(3, '0')}${ext}`);
            movedFiles.push(movedFilePath);
            
            const mainImageUrl = getImageUrl(relativePath);
            newImageUrls.push(mainImageUrl);
            currentImageNumber++;
            
            // 메인 이미지 업데이트
            product = await this.service.updateProduct(id, {
              main_image: mainImageUrl,
            });
          }

          // 추가 이미지 저장
          for (const file of infoImageFiles) {
            const ext = path.extname(file.originalname);
            const relativePath = await moveImageToProductFolder(
              file.path,
              id,
              currentImageNumber,
              ext
            );
            
            const productDir = getProductImageDir(id);
            const movedFilePath = path.join(productDir, `${String(currentImageNumber).padStart(3, '0')}${ext}`);
            movedFiles.push(movedFilePath);
            
            const imageUrl = getImageUrl(relativePath);
            newImageUrls.push(imageUrl);
            currentImageNumber++;
          }

          // 새 이미지만 product_images 테이블에 추가 (기존 이미지는 유지)
          if (newImageUrls.length > 0) {
            await this.service.addProductImages(id, newImageUrls);
          }
        } catch (error) {
          // 에러 발생 시 이동된 파일들 정리
          for (const filePath of movedFiles) {
            try {
              if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
              }
            } catch (unlinkError) {
              console.error(`파일 삭제 실패: ${filePath}`, unlinkError);
            }
          }
          throw error;
        }
      }

      // 최종 상품 정보 조회 (이미지 포함)
      const finalProduct = await this.service.getProductById(id);

      res.json({
        success: true,
        data: finalProduct,
      });
    } catch (error: any) {
      console.error('상품 수정 오류:', error);
      
      // 임시 파일 정리
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        Object.values(files).flat().forEach((file) => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (unlinkError) {
            console.error(`임시 파일 삭제 실패: ${file.path}`, unlinkError);
          }
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || '상품 수정 중 오류가 발생했습니다.',
      });
    }
  };

  /**
   * 상품 삭제
   * DELETE /api/products/:id
   */
  deleteProduct = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteProduct(id);

      res.json({
        success: true,
        message: '상품이 삭제되었습니다.',
      });
    } catch (error: any) {
      console.error('상품 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || '상품 삭제 중 오류가 발생했습니다.',
      });
    }
  };
}

