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
import { computeProductFinalUnitCost } from '../utils/productCostCalculations.js';

function parseOptionalFloat(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNullableInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBool(value: unknown): boolean {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  return false;
}

function buildProductCostFields(formData: Record<string, unknown>) {
  const price = parseOptionalFloat(formData.price) ?? 0;
  const logistics_cost = parseOptionalFloat(formData.logisticsCost) ?? 0;
  const tag_addon_enabled = parseBool(formData.tagAddonEnabled);
  const tag_addon_price = tag_addon_enabled
    ? parseOptionalFloat(formData.tagAddonPrice) ?? 0
    : null;
  const packaging_addon_enabled = parseBool(formData.packagingAddonEnabled);
  const packaging_addon_price = packaging_addon_enabled
    ? parseOptionalFloat(formData.packagingAddonPrice) ?? 0
    : null;
  const labor_cost = parseOptionalFloat(formData.laborCost) ?? 0;

  const final_unit_cost = computeProductFinalUnitCost({
    price,
    logistics_cost,
    tag_addon_enabled,
    tag_addon_price,
    packaging_addon_enabled,
    packaging_addon_price,
    labor_cost,
  });

  return {
    price,
    logistics_cost,
    final_unit_cost,
    has_tag: parseBool(formData.hasTag),
    tag_addon_enabled,
    tag_addon_price,
    packaging_addon_enabled,
    packaging_addon_price,
    labor_cost,
  };
}

function applyProductIdentityFields(
  target: CreateProductDTO | UpdateProductDTO,
  formData: Record<string, unknown>
): void {
  const nameChinese =
    typeof formData.nameChinese === 'string' ? formData.nameChinese.trim() : '';
  const name = typeof formData.name === 'string' ? formData.name.trim() : '';

  if (!name && !nameChinese) {
    return;
  }

  target.name = nameChinese || name;
  target.name_chinese = nameChinese || undefined;
}

function collectUploadedImageFiles(
  files: { [fieldname: string]: Express.Multer.File[] } | undefined
): Express.Multer.File[] {
  if (!files) return [];
  const unified = files.images || [];
  if (unified.length > 0) return unified;
  return [...(files.mainImage || []), ...(files.infoImages || [])];
}

function parseStringArrayField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [value];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function parseExistingImageUrls(formData: Record<string, unknown>): string[] {
  const unified = parseStringArrayField(formData.existingImageUrls);
  if (unified.length > 0) return unified;

  const legacy: string[] = [];
  if (formData.existingMainImageUrl) {
    legacy.push(String(formData.existingMainImageUrl));
  }
  for (const url of parseStringArrayField(formData.existingInfoImageUrls)) {
    if (!legacy.some((item) => urlMatches(item, url))) {
      legacy.push(url);
    }
  }
  return legacy;
}

function normalizeUrlForComparison(url: string): string {
  const withoutQuery = url.split('?')[0];
  try {
    if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
      return new URL(withoutQuery).pathname;
    }
  } catch {
    // fall through
  }
  return withoutQuery;
}

function urlMatches(a: string, b: string): boolean {
  const na = normalizeUrlForComparison(a);
  const nb = normalizeUrlForComparison(b);
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

function isUrlKept(img: string, keepUrls: string[]): boolean {
  return keepUrls.some((keep) => urlMatches(img, keep));
}

function resolveStoredUrl(clientUrl: string, storedUrls: string[]): string | null {
  const match = storedUrls.find((stored) => urlMatches(stored, clientUrl));
  return match ?? null;
}

async function saveUploadedProductImages(
  productId: string,
  imageFiles: Express.Multer.File[]
): Promise<string[]> {
  if (imageFiles.length === 0) return [];

  await createProductImageDir(productId);
  let currentImageNumber = await getNextImageNumber(productId);
  const imageUrls: string[] = [];
  const movedFiles: string[] = [];

  try {
    for (const file of imageFiles) {
      const ext = path.extname(file.originalname);
      const relativePath = await moveImageToProductFolder(
        file.path,
        productId,
        currentImageNumber,
        ext
      );

      const productDir = getProductImageDir(productId);
      const movedFilePath = path.join(
        productDir,
        `${String(currentImageNumber).padStart(3, '0')}${ext}`
      );
      movedFiles.push(movedFilePath);

      imageUrls.push(getImageUrl(relativePath));
      currentImageNumber++;
    }
  } catch (error) {
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

  return imageUrls;
}

function cleanupTempUploadFiles(
  files: { [fieldname: string]: Express.Multer.File[] } | undefined
): void {
  if (!files) return;
  Object.values(files)
    .flat()
    .forEach((file) => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (unlinkError) {
        console.error(`임시 파일 삭제 실패: ${file.path}`, unlinkError);
      }
    });
}

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
      const imageFiles = collectUploadedImageFiles(files);

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
        name: '',
        category: formData.category || '잡화',
        ...buildProductCostFields(formData),
        stock: parseOptionalInt(formData.stock) ?? 0,
        size: formData.size || undefined,
        packaging_size: formData.packagingSize || undefined,
        weight: formData.weight || undefined,
        set_count: formData.setCount ? parseInt(formData.setCount) : undefined,
        small_pack_count: formData.smallPackCount ? parseInt(formData.smallPackCount) : undefined,
        box_count: formData.boxCount ? parseInt(formData.boxCount) : undefined,
        reorder_moq: parseNullableInt(formData.reorderMoq),
        delivery_days: parseNullableInt(formData.deliveryDays),
        supplier_id: supplierId,
        created_by: formData.createdBy || undefined,
      };
      applyProductIdentityFields(productData, formData);

      // 1. 상품 생성 (상품 ID 획득)
      const product = await this.service.createProduct(productData);

      // 2. 상품코드 폴더 생성
      await createProductImageDir(product.id);

      // 3. 이미지 파일 처리 (첫 번째 이미지를 목록 썸네일용 main_image로 사용)
      try {
        const imageUrls = await saveUploadedProductImages(product.id, imageFiles);

        if (imageUrls.length > 0) {
          await this.service.updateProduct(product.id, {
            main_image: imageUrls[0],
          });
          await this.service.saveProductImages(product.id, imageUrls);
        }
      } catch (error) {
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
      cleanupTempUploadFiles(req.files as { [fieldname: string]: Express.Multer.File[] } | undefined);

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
      const imageFiles = collectUploadedImageFiles(files);
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
        ...buildProductCostFields(formData),
        stock: parseOptionalInt(formData.stock),
        size: formData.size || undefined,
        packaging_size: formData.packagingSize || undefined,
        weight: formData.weight || undefined,
        set_count: formData.setCount ? parseInt(formData.setCount) : undefined,
        small_pack_count: formData.smallPackCount ? parseInt(formData.smallPackCount) : undefined,
        box_count: formData.boxCount ? parseInt(formData.boxCount) : undefined,
        reorder_moq: parseNullableInt(formData.reorderMoq),
        delivery_days: parseNullableInt(formData.deliveryDays),
        supplier_id: supplierId,
        updated_by: formData.updatedBy || undefined,
      };
      applyProductIdentityFields(productData, formData);

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
      const allExistingUrls = [
        ...(existingProductBeforeUpdate.main_image
          ? [existingProductBeforeUpdate.main_image]
          : []),
        ...existingImages.filter(
          (img) =>
            !existingProductBeforeUpdate.main_image ||
            !urlMatches(img, existingProductBeforeUpdate.main_image)
        ),
      ];

      const keepImageUrls = parseExistingImageUrls(formData);

      const imagesToDelete = allExistingUrls.filter(
        (img) => !isUrlKept(img, keepImageUrls)
      );

      if (imagesToDelete.length > 0) {
        await this.service.deleteProductImages(id, imagesToDelete);
      }

      const remainingExistingUrls = allExistingUrls.filter(
        (img) => !imagesToDelete.includes(img)
      );

      const newImageUrls =
        imageFiles.length > 0
          ? await saveUploadedProductImages(id, imageFiles)
          : [];

      if (newImageUrls.length > 0) {
        await this.service.addProductImages(id, newImageUrls);
      }

      const keptMainCandidates = keepImageUrls
        .map((url) => resolveStoredUrl(url, remainingExistingUrls))
        .filter((url): url is string => url !== null);

      const nextMainImage =
        keptMainCandidates[0] ?? newImageUrls[0] ?? null;

      product = await this.service.updateProduct(id, {
        main_image: nextMainImage,
      });

      // 최종 상품 정보 조회 (이미지 포함)
      const finalProduct = await this.service.getProductById(id);

      res.json({
        success: true,
        data: finalProduct,
      });
    } catch (error: any) {
      console.error('상품 수정 오류:', error);
      cleanupTempUploadFiles(req.files as { [fieldname: string]: Express.Multer.File[] } | undefined);

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

