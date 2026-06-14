import { pool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import {
  ShopBuyer,
  ShopBuyerAddress,
  ShopBuyerListItem,
  CreateShopBuyerDTO,
  UpdateShopBuyerDTO,
} from '../models/shopBuyer.js';

interface BuyerRow extends RowDataPacket {
  id: number;
  company_name: string;
  kakao_id: string | null;
  business_registration_number: string | null;
  business_registration_image: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

interface BuyerListRow extends RowDataPacket {
  id: number;
  company_name: string;
  kakao_id: string | null;
  business_registration_number: string | null;
  business_registration_image: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AddressRow extends RowDataPacket {
  id: number;
  buyer_id: number;
  address: string;
  recipient_name: string;
  phone_number: string;
  sort_order: number;
  created_at: Date;
}

export class ShopBuyerRepository {
  async findAllList(): Promise<ShopBuyerListItem[]> {
    const [rows] = await pool.execute<BuyerListRow[]>(
      `SELECT id, company_name, kakao_id, business_registration_number,
              business_registration_image, created_at, updated_at
       FROM kr_shop_buyers
       ORDER BY created_at DESC`
    );

    if (rows.length === 0) return [];

    const buyerIds = rows.map((row) => row.id);
    const placeholders = buyerIds.map(() => '?').join(', ');
    const [addressRows] = await pool.execute<AddressRow[]>(
      `SELECT id, buyer_id, address, recipient_name, phone_number, sort_order, created_at
       FROM kr_shop_buyer_addresses
       WHERE buyer_id IN (${placeholders})
       ORDER BY buyer_id ASC, sort_order ASC, id ASC`,
      buyerIds
    );

    const addressesByBuyerId = new Map<number, ShopBuyerAddress[]>();
    for (const row of addressRows) {
      const list = addressesByBuyerId.get(row.buyer_id) ?? [];
      list.push({
        id: row.id,
        address: row.address,
        recipientName: row.recipient_name,
        phoneNumber: row.phone_number,
        sortOrder: row.sort_order,
      });
      addressesByBuyerId.set(row.buyer_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      companyName: row.company_name,
      kakaoId: row.kakao_id,
      businessRegistrationNumber: row.business_registration_number,
      businessRegistrationImage: row.business_registration_image,
      addresses: addressesByBuyerId.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findById(id: number): Promise<ShopBuyer | null> {
    const [buyerRows] = await pool.execute<BuyerRow[]>(
      `SELECT id, company_name, kakao_id, business_registration_number,
              business_registration_image, created_at, updated_at, created_by
       FROM kr_shop_buyers WHERE id = ?`,
      [id]
    );

    if (buyerRows.length === 0) return null;

    const addresses = await this.findAddressesByBuyerId(id);
    return this.mapBuyer(buyerRows[0], addresses);
  }

  async findAddressesByBuyerId(buyerId: number): Promise<ShopBuyerAddress[]> {
    const [rows] = await pool.execute<AddressRow[]>(
      `SELECT id, buyer_id, address, recipient_name, phone_number, sort_order, created_at
       FROM kr_shop_buyer_addresses
       WHERE buyer_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [buyerId]
    );

    return rows.map((row) => ({
      id: row.id,
      address: row.address,
      recipientName: row.recipient_name,
      phoneNumber: row.phone_number,
      sortOrder: row.sort_order,
    }));
  }

  async create(data: CreateShopBuyerDTO): Promise<ShopBuyer> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO kr_shop_buyers (company_name, kakao_id, business_registration_number, created_by)
         VALUES (?, ?, ?, ?)`,
        [
          data.companyName.trim(),
          data.kakaoId?.trim() || null,
          data.businessRegistrationNumber?.trim() || null,
          data.createdBy ?? null,
        ]
      );

      const buyerId = result.insertId;
      await this.replaceAddresses(connection, buyerId, data.addresses ?? []);

      await connection.commit();

      const buyer = await this.findById(buyerId);
      if (!buyer) throw new Error('구매자 생성 후 조회에 실패했습니다.');
      return buyer;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id: number, data: UpdateShopBuyerDTO): Promise<ShopBuyer | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const fields: string[] = [];
      const values: unknown[] = [];

      if (data.companyName !== undefined) {
        fields.push('company_name = ?');
        values.push(data.companyName.trim());
      }
      if (data.kakaoId !== undefined) {
        fields.push('kakao_id = ?');
        values.push(data.kakaoId?.trim() || null);
      }
      if (data.businessRegistrationNumber !== undefined) {
        fields.push('business_registration_number = ?');
        values.push(data.businessRegistrationNumber?.trim() || null);
      }

      if (fields.length > 0) {
        values.push(id);
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE kr_shop_buyers SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
        if (result.affectedRows === 0) {
          await connection.rollback();
          return null;
        }
      }

      if (data.addresses !== undefined) {
        await this.replaceAddresses(connection, id, data.addresses);
      }

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateBusinessRegistrationImage(
    id: number,
    imageUrl: string | null
  ): Promise<ShopBuyer | null> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE kr_shop_buyers SET business_registration_image = ? WHERE id = ?`,
      [imageUrl, id]
    );
    if (result.affectedRows === 0) return null;
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM kr_shop_buyers WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  private async replaceAddresses(
    connection: PoolConnection,
    buyerId: number,
    addresses: ShopBuyerAddress[]
  ): Promise<void> {
    await connection.execute(`DELETE FROM kr_shop_buyer_addresses WHERE buyer_id = ?`, [buyerId]);

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      await connection.execute<ResultSetHeader>(
        `INSERT INTO kr_shop_buyer_addresses
         (buyer_id, address, recipient_name, phone_number, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [
          buyerId,
          addr.address.trim(),
          addr.recipientName.trim(),
          addr.phoneNumber.trim(),
          i,
        ]
      );
    }
  }

  private mapBuyer(row: BuyerRow, addresses: ShopBuyerAddress[]): ShopBuyer {
    return {
      id: row.id,
      companyName: row.company_name,
      kakaoId: row.kakao_id,
      businessRegistrationNumber: row.business_registration_number,
      businessRegistrationImage: row.business_registration_image,
      addresses,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
