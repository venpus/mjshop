import { pool } from '../config/database.js';
import {
  Material,
  CreateMaterialDTO,
  UpdateMaterialDTO,
  MaterialInventoryTransaction,
  CreateInventoryTransactionDTO,
  MaterialTestImageMetadata,
  UpdateTestImageMetadataDTO,
} from '../models/material.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface MaterialRow extends RowDataPacket {
  id: number;
  code: string;
  date: Date;
  product_name: string;
  product_name_chinese: string | null;
  category: string;
  type_count: number;
  link: string | null;
  price: number | null;
  purchase_complete: boolean;
  current_stock: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface MaterialImageRow extends RowDataPacket {
  image_url: string;
  image_type: string;
  display_order: number;
}

export class MaterialRepository {
  /**
   * 모든 부자재 조회
   */
  async findAll(): Promise<Material[]> {
    const [rows] = await pool.execute<MaterialRow[]>(
      `SELECT id, code, date, product_name, product_name_chinese, category,
              type_count, link, price, purchase_complete, current_stock,
              created_at, updated_at, created_by, updated_by
       FROM materials
       ORDER BY created_at DESC`
    );

    return rows.map(this.mapRowToMaterial);
  }

  /**
   * ID로 부자재 조회
   */
  async findById(id: number): Promise<Material | null> {
    const [rows] = await pool.execute<MaterialRow[]>(
      `SELECT id, code, date, product_name, product_name_chinese, category,
              type_count, link, price, purchase_complete, current_stock,
              created_at, updated_at, created_by, updated_by
       FROM materials
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToMaterial(rows[0]);
  }

  /**
   * 코드로 부자재 조회
   */
  async findByCode(code: string): Promise<Material | null> {
    const [rows] = await pool.execute<MaterialRow[]>(
      `SELECT id, code, date, product_name, product_name_chinese, category,
              type_count, link, price, purchase_complete, current_stock,
              created_at, updated_at, created_by, updated_by
       FROM materials
       WHERE code = ?`,
      [code]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToMaterial(rows[0]);
  }

  /**
   * 다음 부자재 코드 생성 (MAT001 형식)
   */
  async generateNextCode(): Promise<string> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT code FROM materials WHERE code LIKE 'MAT%' ORDER BY code DESC LIMIT 1`
    );

    if (rows.length === 0) {
      return 'MAT001';
    }

    const lastCode = rows[0].code as string;
    const number = parseInt(lastCode.substring(3), 10);
    const nextNumber = number + 1;
    return `MAT${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * 부자재 생성
   */
  async create(data: CreateMaterialDTO): Promise<Material> {
    const {
      code,
      date,
      productName,
      productNameChinese,
      category,
      typeCount,
      link,
      price,
      purchaseComplete,
      currentStock,
      created_by,
    } = data;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO materials
       (code, date, product_name, product_name_chinese, category, type_count,
        link, price, purchase_complete, current_stock, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        date,
        productName,
        productNameChinese || null,
        category,
        typeCount || 1,
        link || null,
        price || null,
        purchaseComplete || false,
        currentStock || 0,
        created_by || null,
      ]
    );

    const insertedId = result.insertId;
    const material = await this.findById(insertedId);
    if (!material) {
      throw new Error('부자재 생성 후 조회에 실패했습니다.');
    }

    return material;
  }

  /**
   * 부자재 수정
   */
  async update(id: number, data: UpdateMaterialDTO): Promise<Material> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }
    if (data.productName !== undefined) {
      updates.push('product_name = ?');
      values.push(data.productName);
    }
    if (data.productNameChinese !== undefined) {
      updates.push('product_name_chinese = ?');
      values.push(data.productNameChinese || null);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.typeCount !== undefined) {
      updates.push('type_count = ?');
      values.push(data.typeCount);
    }
    if (data.link !== undefined) {
      updates.push('link = ?');
      values.push(data.link || null);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price || null);
    }
    if (data.purchaseComplete !== undefined) {
      updates.push('purchase_complete = ?');
      values.push(data.purchaseComplete);
    }
    if (data.currentStock !== undefined) {
      updates.push('current_stock = ?');
      values.push(data.currentStock);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      const material = await this.findById(id);
      if (!material) {
        throw new Error('부자재를 찾을 수 없습니다.');
      }
      return material;
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE materials SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const material = await this.findById(id);
    if (!material) {
      throw new Error('부자재 수정 후 조회에 실패했습니다.');
    }

    return material;
  }

  /**
   * 부자재 삭제
   */
  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM materials WHERE id = ?', [id]);
  }

  /**
   * 부자재 입출고 기록 조회
   */
  async findInventoryTransactions(materialId: number): Promise<MaterialInventoryTransaction[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, material_id, transaction_date, transaction_type, quantity,
              related_order, notes, created_at, created_by
       FROM material_inventory_transactions
       WHERE material_id = ?
       ORDER BY transaction_date DESC, created_at DESC`,
      [materialId]
    );

    return rows.map((row) => ({
      id: row.id,
      materialId: row.material_id,
      transactionDate: row.transaction_date,
      transactionType: row.transaction_type,
      quantity: row.quantity,
      relatedOrder: row.related_order,
      notes: row.notes,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  /**
   * 부자재 입출고 기록 추가
   * 트랜잭션 내에서 사용해야 함
   */
  async createInventoryTransaction(
    connection: any,
    materialId: number,
    data: CreateInventoryTransactionDTO
  ): Promise<MaterialInventoryTransaction> {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO material_inventory_transactions
       (material_id, transaction_date, transaction_type, quantity, related_order, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        materialId,
        data.transactionDate,
        data.transactionType,
        data.quantity,
        data.relatedOrder || null,
        data.notes || null,
        data.created_by || null,
      ]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, material_id, transaction_date, transaction_type, quantity,
              related_order, notes, created_at, created_by
       FROM material_inventory_transactions
       WHERE id = ?`,
      [result.insertId]
    );

    if (rows.length === 0) {
      throw new Error('입출고 기록 생성 후 조회에 실패했습니다.');
    }

    const row = rows[0];
    return {
      id: row.id,
      materialId: row.material_id,
      transactionDate: row.transaction_date,
      transactionType: row.transaction_type,
      quantity: row.quantity,
      relatedOrder: row.related_order,
      notes: row.notes,
      createdAt: row.created_at,
      createdBy: row.created_by,
    };
  }

  /**
   * 부자재 현재 재고 조회 (SELECT FOR UPDATE로 락)
   * 트랜잭션 내에서 사용해야 함
   */
  async findCurrentStockForUpdate(connection: any, materialId: number): Promise<number> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT current_stock FROM materials WHERE id = ? FOR UPDATE`,
      [materialId]
    );

    if (rows.length === 0) {
      throw new Error('부자재를 찾을 수 없습니다.');
    }

    return rows[0].current_stock;
  }

  /**
   * 부자재 현재 재고 업데이트
   * 트랜잭션 내에서 사용해야 함
   */
  async updateCurrentStock(connection: any, materialId: number, newStock: number): Promise<void> {
    await connection.execute(
      `UPDATE materials SET current_stock = ? WHERE id = ?`,
      [newStock, materialId]
    );
  }

  /**
   * 부자재 이미지 조회
   */
  async findImagesByMaterialId(materialId: number, imageType?: 'product' | 'test'): Promise<MaterialImageRow[]> {
    if (imageType) {
      const [rows] = await pool.execute<MaterialImageRow[]>(
        `SELECT image_url, image_type, display_order
         FROM material_images
         WHERE material_id = ? AND image_type = ?
         ORDER BY display_order ASC, id ASC`,
        [materialId, imageType]
      );
      return rows;
    } else {
      const [rows] = await pool.execute<MaterialImageRow[]>(
        `SELECT image_url, image_type, display_order
         FROM material_images
         WHERE material_id = ?
         ORDER BY image_type ASC, display_order ASC, id ASC`,
        [materialId]
      );
      return rows;
    }
  }

  /**
   * 부자재 이미지 저장 (기존 이미지 모두 삭제 후 새로 저장)
   */
  async saveImages(materialId: number, imageType: 'product' | 'test', imageUrls: string[]): Promise<void> {
    // 기존 이미지 삭제
    await this.deleteImagesByType(materialId, imageType);

    if (imageUrls.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];

    imageUrls.forEach((imageUrl, index) => {
      values.push(materialId, imageType, imageUrl, index);
      placeholders.push('(?, ?, ?, ?)');
    });

    await pool.execute<ResultSetHeader>(
      `INSERT INTO material_images (material_id, image_type, image_url, display_order)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  /**
   * 부자재 이미지 추가 (기존 이미지 유지하면서 새 이미지 추가)
   */
  async addImages(materialId: number, imageType: 'product' | 'test', imageUrls: string[]): Promise<void> {
    if (imageUrls.length === 0) return;

    // 기존 이미지 조회하여 최대 display_order 확인
    const existingImages = await this.findImagesByMaterialId(materialId, imageType);
    const maxDisplayOrder = existingImages.length > 0
      ? Math.max(...existingImages.map(img => img.display_order)) + 1
      : 0;

    const values: any[] = [];
    const placeholders: string[] = [];

    imageUrls.forEach((imageUrl, index) => {
      values.push(materialId, imageType, imageUrl, maxDisplayOrder + index);
      placeholders.push('(?, ?, ?, ?)');
    });

    await pool.execute<ResultSetHeader>(
      `INSERT INTO material_images (material_id, image_type, image_url, display_order)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  /**
   * 부자재 이미지 삭제 (타입별)
   */
  async deleteImagesByType(materialId: number, imageType: 'product' | 'test'): Promise<void> {
    await pool.execute(
      'DELETE FROM material_images WHERE material_id = ? AND image_type = ?',
      [materialId, imageType]
    );
  }

  /**
   * 부자재 이미지 모두 삭제
   */
  async deleteAllImages(materialId: number): Promise<void> {
    await pool.execute('DELETE FROM material_images WHERE material_id = ?', [materialId]);
  }

  /**
   * 테스트 이미지 메타데이터 조회
   */
  async findTestImageMetadata(materialId: number): Promise<MaterialTestImageMetadata[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, material_id, image_url, reaction, memo, confirmed_by, confirmed_at, updated_at
       FROM material_test_image_metadata
       WHERE material_id = ?
       ORDER BY id ASC`,
      [materialId]
    );

    return rows.map((row) => ({
      id: row.id,
      materialId: row.material_id,
      imageUrl: row.image_url,
      reaction: row.reaction,
      memo: row.memo,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * 테스트 이미지 메타데이터 조회 (특정 이미지)
   */
  async findTestImageMetadataByImageUrl(
    materialId: number,
    imageUrl: string
  ): Promise<MaterialTestImageMetadata | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, material_id, image_url, reaction, memo, confirmed_by, confirmed_at, updated_at
       FROM material_test_image_metadata
       WHERE material_id = ? AND image_url = ?
       LIMIT 1`,
      [materialId, imageUrl]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      materialId: row.material_id,
      imageUrl: row.image_url,
      reaction: row.reaction,
      memo: row.memo,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 테스트 이미지 메타데이터 저장/업데이트 (UPSERT)
   */
  async upsertTestImageMetadata(
    materialId: number,
    imageUrl: string,
    data: UpdateTestImageMetadataDTO
  ): Promise<MaterialTestImageMetadata> {
    // 기존 메타데이터 조회
    const existing = await this.findTestImageMetadataByImageUrl(materialId, imageUrl);

    if (existing) {
      // 업데이트
      const updates: string[] = [];
      const values: any[] = [];

      if (data.reaction !== undefined) {
        updates.push('reaction = ?');
        values.push(data.reaction);
      }
      if (data.memo !== undefined) {
        updates.push('memo = ?');
        values.push(data.memo || null);
      }
      if (data.confirmed !== undefined) {
        if (data.confirmed) {
          // 확인 처리
          updates.push('confirmed_by = ?');
          updates.push('confirmed_at = ?');
          values.push(data.confirmedBy || null);
          values.push(new Date());
        } else {
          // 확인 취소 (NULL 값은 별도로 처리)
          updates.push('confirmed_by = NULL');
          updates.push('confirmed_at = NULL');
        }
      }

      if (updates.length > 0) {
        values.push(materialId, imageUrl);
        await pool.execute(
          `UPDATE material_test_image_metadata
           SET ${updates.join(', ')}
           WHERE material_id = ? AND image_url = ?`,
          values
        );
      }

      // 업데이트된 데이터 조회
      const updated = await this.findTestImageMetadataByImageUrl(materialId, imageUrl);
      if (!updated) {
        throw new Error('메타데이터 업데이트 후 조회에 실패했습니다.');
      }
      return updated;
    } else {
      // 새로 생성
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO material_test_image_metadata
         (material_id, image_url, reaction, memo, confirmed_by, confirmed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          imageUrl,
          data.reaction || null,
          data.memo || null,
          data.confirmed ? data.confirmedBy || null : null,
          data.confirmed ? new Date() : null,
        ]
      );

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, material_id, image_url, reaction, memo, confirmed_by, confirmed_at, updated_at
         FROM material_test_image_metadata
         WHERE id = ?`,
        [result.insertId]
      );

      if (rows.length === 0) {
        throw new Error('메타데이터 생성 후 조회에 실패했습니다.');
      }

      const row = rows[0];
      return {
        id: row.id,
        materialId: row.material_id,
        imageUrl: row.image_url,
        reaction: row.reaction,
        memo: row.memo,
        confirmedBy: row.confirmed_by,
        confirmedAt: row.confirmed_at,
        updatedAt: row.updated_at,
      };
    }
  }

  /**
   * Row를 Material로 변환
   */
  private mapRowToMaterial(row: MaterialRow): Material {
    return {
      id: row.id,
      code: row.code,
      date: row.date,
      productName: row.product_name,
      productNameChinese: row.product_name_chinese,
      category: row.category,
      typeCount: row.type_count,
      link: row.link,
      price: row.price,
      purchaseComplete: row.purchase_complete,
      currentStock: row.current_stock,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }
}

