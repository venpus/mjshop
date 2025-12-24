import { pool } from '../config/database.js';
import { Product, CreateProductDTO, UpdateProductDTO } from '../models/product.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 데이터베이스에서 조회한 결과 타입
interface ProductRow extends RowDataPacket {
  id: string;
  name: string;
  name_chinese: string | null;
  category: string;
  price: number;
  stock: number;
  status: string;
  size: string | null;
  packaging_size: string | null;
  weight: string | null;
  set_count: number;
  small_pack_count: number;
  box_count: number;
  main_image: string | null;
  supplier_id: number | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProductImageRow extends RowDataPacket {
  image_url: string;
  display_order: number;
}

interface SupplierRow extends RowDataPacket {
  id: number;
  name: string;
  url: string | null;
}

export class ProductRepository {
  /**
   * 모든 상품 조회
   */
  async findAll(): Promise<Product[]> {
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT id, name, name_chinese, category, price, stock, status, 
              size, packaging_size, weight, set_count, small_pack_count, box_count,
              main_image, supplier_id, created_at, updated_at, created_by, updated_by
       FROM products
       ORDER BY created_at DESC`
    );
    
    return rows.map(this.mapRowToProduct);
  }

  /**
   * ID로 상품 조회
   */
  async findById(id: string): Promise<Product | null> {
    const [rows] = await pool.execute<ProductRow[]>(
      `SELECT id, name, name_chinese, category, price, stock, status, 
              size, packaging_size, weight, set_count, small_pack_count, box_count,
              main_image, supplier_id, created_at, updated_at, created_by, updated_by
       FROM products
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProduct(rows[0]);
  }

  /**
   * 상품 생성
   */
  async create(data: CreateProductDTO, productId: string): Promise<Product> {
    const {
      name,
      name_chinese,
      category,
      price,
      size,
      packaging_size,
      weight,
      set_count = 1,
      small_pack_count = 1,
      box_count = 1,
      supplier_id,
      created_by,
    } = data;

    await pool.execute<ResultSetHeader>(
      `INSERT INTO products 
       (id, name, name_chinese, category, price, stock, status, 
        size, packaging_size, weight, set_count, small_pack_count, box_count,
        supplier_id, created_by)
       VALUES (?, ?, ?, ?, ?, 0, '판매중', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        name,
        name_chinese || null,
        category,
        price,
        size || null,
        packaging_size || null,
        weight || null,
        set_count,
        small_pack_count,
        box_count,
        supplier_id || null,
        created_by || null,
      ]
    );

    const product = await this.findById(productId);
    if (!product) {
      throw new Error('상품 생성 후 조회에 실패했습니다.');
    }

    return product;
  }

  /**
   * 상품 수정
   */
  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.name_chinese !== undefined) {
      updates.push('name_chinese = ?');
      values.push(data.name_chinese || null);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }
    if (data.stock !== undefined) {
      updates.push('stock = ?');
      values.push(data.stock);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.size !== undefined) {
      updates.push('size = ?');
      values.push(data.size || null);
    }
    if (data.packaging_size !== undefined) {
      updates.push('packaging_size = ?');
      values.push(data.packaging_size || null);
    }
    if (data.weight !== undefined) {
      updates.push('weight = ?');
      values.push(data.weight || null);
    }
    if (data.set_count !== undefined) {
      updates.push('set_count = ?');
      values.push(data.set_count);
    }
    if (data.small_pack_count !== undefined) {
      updates.push('small_pack_count = ?');
      values.push(data.small_pack_count);
    }
    if (data.box_count !== undefined) {
      updates.push('box_count = ?');
      values.push(data.box_count);
    }
    if (data.main_image !== undefined) {
      updates.push('main_image = ?');
      values.push(data.main_image || null);
    }
    if (data.supplier_id !== undefined) {
      updates.push('supplier_id = ?');
      values.push(data.supplier_id || null);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by || null);
    }

    if (updates.length === 0) {
      const product = await this.findById(id);
      if (!product) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      return product;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const product = await this.findById(id);
    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    return product;
  }

  /**
   * 상품 삭제
   */
  async delete(id: string): Promise<void> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error('상품을 찾을 수 없습니다.');
    }
  }

  /**
   * 상품 이미지 조회
   */
  async findImagesByProductId(productId: string): Promise<string[]> {
    const [rows] = await pool.execute<ProductImageRow[]>(
      `SELECT image_url 
       FROM product_images 
       WHERE product_id = ? 
       ORDER BY display_order ASC, id ASC`,
      [productId]
    );

    return rows.map((row) => row.image_url);
  }

  /**
   * 상품 이미지 저장 (기존 이미지 모두 삭제 후 새로 저장)
   */
  async saveImages(productId: string, imageUrls: string[]): Promise<void> {
    // 기존 이미지 삭제
    await pool.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);

    // 새 이미지 저장
    if (imageUrls.length > 0) {
      const values = imageUrls.map((url, index) => [productId, url, index]);
      const placeholders = values.map(() => '(?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await pool.execute(
        `INSERT INTO product_images (product_id, image_url, display_order) 
         VALUES ${placeholders}`,
        flatValues
      );
    }
  }

  /**
   * 상품 이미지 추가 (기존 이미지 유지하면서 새 이미지 추가)
   */
  async addImages(productId: string, imageUrls: string[]): Promise<void> {
    if (imageUrls.length === 0) {
      return;
    }

    // 현재 최대 display_order 조회
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT MAX(display_order) as max_order FROM product_images WHERE product_id = ?',
      [productId]
    );
    const maxOrder = rows.length > 0 && rows[0].max_order !== null ? (rows[0].max_order as number) : -1;

    // 새 이미지 저장 (기존 순서 이후에 추가)
    const values = imageUrls.map((url, index) => [productId, url, maxOrder + 1 + index]);
    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
    const flatValues = values.flat();

    await pool.execute(
      `INSERT INTO product_images (product_id, image_url, display_order) 
       VALUES ${placeholders}`,
      flatValues
    );
  }

  /**
   * 상품 이미지 삭제 (특정 URL들만 삭제)
   */
  async deleteImages(productId: string, imageUrls: string[]): Promise<void> {
    if (imageUrls.length === 0) {
      return;
    }

    const placeholders = imageUrls.map(() => '?').join(', ');
    await pool.execute(
      `DELETE FROM product_images WHERE product_id = ? AND image_url IN (${placeholders})`,
      [productId, ...imageUrls]
    );
  }

  /**
   * 상품 ID 존재 여부 확인
   */
  async existsById(id: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM products WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0;
  }

  /**
   * 다음 상품 ID 생성 (P001 형식)
   */
  async generateNextId(): Promise<string> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM products WHERE id LIKE 'P%' ORDER BY id DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return 'P001';
    }

    const lastId = rows[0].id as string;
    const number = parseInt(lastId.substring(1), 10);
    const nextNumber = number + 1;
    return `P${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * 공급상 이름으로 조회 (정확한 이름)
   */
  async findSupplierByName(name: string): Promise<SupplierRow | null> {
    const [rows] = await pool.execute<SupplierRow[]>(
      'SELECT id, name, url FROM suppliers WHERE name = ? LIMIT 1',
      [name]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 공급상 이름으로 유사 검색 (자동완성용)
   */
  async searchSuppliersByName(searchTerm: string, limit: number = 10): Promise<SupplierRow[]> {
    const [rows] = await pool.execute<SupplierRow[]>(
      'SELECT id, name, url FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT ?',
      [`%${searchTerm}%`, limit]
    );
    return rows;
  }

  /**
   * 공급상 생성
   */
  async createSupplier(name: string, url: string | null): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO suppliers (name, url) VALUES (?, ?)',
      [name, url || null]
    );
    return result.insertId;
  }

  /**
   * 공급상 ID로 조회
   */
  async findSupplierById(id: number): Promise<SupplierRow | null> {
    const [rows] = await pool.execute<SupplierRow[]>(
      'SELECT id, name, url FROM suppliers WHERE id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 상품명으로 중복 상품 조회 (자기 자신 제외)
   */
  async findByName(name: string, excludeId?: string): Promise<Product | null> {
    let query = 'SELECT id, name, name_chinese, category, price, stock, status, size, packaging_size, weight, set_count, small_pack_count, box_count, main_image, supplier_id, created_at, updated_at, created_by, updated_by FROM products WHERE name = ?';
    const params: any[] = [name];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    query += ' LIMIT 1';
    
    const [rows] = await pool.execute<ProductRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToProduct(rows[0]) : null;
  }

  /**
   * Row를 Product 객체로 변환
   */
  private mapRowToProduct(row: ProductRow): Product {
    return {
      id: row.id,
      name: row.name,
      name_chinese: row.name_chinese,
      category: row.category as any,
      price: Number(row.price),
      stock: row.stock,
      status: row.status as any,
      size: row.size,
      packaging_size: row.packaging_size,
      weight: row.weight,
      set_count: row.set_count,
      small_pack_count: row.small_pack_count,
      box_count: row.box_count,
      main_image: row.main_image,
      supplier_id: row.supplier_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }
}

