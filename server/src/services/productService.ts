import { ProductRepository } from '../repositories/productRepository.js';
import {
  Product,
  ProductPublic,
  CreateProductDTO,
  UpdateProductDTO,
} from '../models/product.js';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * 모든 상품 조회
   */
  async getAllProducts(): Promise<ProductPublic[]> {
    const products = await this.repository.findAll();
    return Promise.all(products.map((p) => this.enrichProduct(p)));
  }

  /**
   * ID로 상품 조회
   */
  async getProductById(id: string): Promise<ProductPublic | null> {
    const product = await this.repository.findById(id);
    if (!product) {
      return null;
    }
    return this.enrichProduct(product);
  }

  /**
   * 새 상품 생성
   */
  async createProduct(
    data: CreateProductDTO,
    createdBy?: string
  ): Promise<ProductPublic> {
    // 상품 ID 생성
    const productId = await this.repository.generateNextId();

    // 상품명 중복 체크 및 처리
    let productName = data.name;
    if (productName) {
      const existingProduct = await this.repository.findByName(productName);
      if (existingProduct) {
        // 중복이면 상품명 뒤에 "-상품ID" 추가
        productName = `${productName}-${productId}`;
      }
    }

    // 상품 생성
    const productData: CreateProductDTO = {
      ...data,
      name: productName,
      created_by: createdBy,
    };

    const product = await this.repository.create(productData, productId);

    return this.enrichProduct(product);
  }

  /**
   * 상품 수정
   */
  async updateProduct(
    id: string,
    data: UpdateProductDTO,
    updatedBy?: string
  ): Promise<ProductPublic> {
    // 상품 존재 확인
    const existingProduct = await this.repository.findById(id);
    if (!existingProduct) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    // 상품명 중복 체크 및 처리 (이름이 변경되는 경우만)
    let productName = data.name;
    if (productName !== undefined && productName !== existingProduct.name) {
      const duplicateProduct = await this.repository.findByName(productName, id);
      if (duplicateProduct) {
        // 중복이면 상품명 뒤에 "-상품ID" 추가
        productName = `${productName}-${id}`;
      }
    }

    // 상품 수정
    const updateData: UpdateProductDTO = {
      ...data,
      name: productName !== undefined ? productName : data.name,
      updated_by: updatedBy,
    };

    const product = await this.repository.update(id, updateData);

    return this.enrichProduct(product);
  }

  /**
   * 상품 삭제
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    await this.repository.delete(id);
  }

  /**
   * 상품 이미지 저장 (기존 이미지 모두 삭제 후 새로 저장)
   */
  async saveProductImages(productId: string, imageUrls: string[]): Promise<void> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    await this.repository.saveImages(productId, imageUrls);
  }

  /**
   * 상품 이미지 추가 (기존 이미지 유지하면서 새 이미지 추가)
   */
  async addProductImages(productId: string, imageUrls: string[]): Promise<void> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    await this.repository.addImages(productId, imageUrls);
  }

  /**
   * 상품 이미지 삭제
   */
  async deleteProductImages(productId: string, imageUrls: string[]): Promise<void> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    await this.repository.deleteImages(productId, imageUrls);
  }


  /**
   * Product를 ProductPublic으로 변환 (공급업체 정보 및 이미지 포함)
   */
  private async enrichProduct(product: Product): Promise<ProductPublic> {
    // 이미지 조회
    const images = await this.repository.findImagesByProductId(product.id);

    // 공급업체 정보는 일단 null로 설정 (나중에 Supplier Repository 추가 시 구현)
    const result: ProductPublic = {
      ...product,
      images,
    };

    // 공급업체 정보가 있으면 조회
    if (product.supplier_id) {
      const supplier = await this.repository.findSupplierById(product.supplier_id);
      if (supplier) {
        result.supplier = {
          id: supplier.id,
          name: supplier.name,
          url: supplier.url,
        };
      }
    }

    return result;
  }
}

