import { pool } from '../config/database.js';
import { RowDataPacket } from 'mysql2';

export interface InlandCompany {
  id: number;
  name: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Warehouse {
  id: number;
  name: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

interface InlandCompanyRow extends RowDataPacket {
  id: number;
  name: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

interface WarehouseRow extends RowDataPacket {
  id: number;
  name: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export class LogisticsOptionsRepository {
  /**
   * 모든 내륙운송회사 조회 (표시 순서대로)
   */
  async findAllInlandCompanies(): Promise<InlandCompany[]> {
    const [rows] = await pool.execute<InlandCompanyRow[]>(
      `SELECT id, name, display_order, created_at, updated_at
       FROM inland_companies
       ORDER BY display_order ASC, id ASC`
    );
    
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * 모든 도착 창고 조회 (표시 순서대로)
   */
  async findAllWarehouses(): Promise<Warehouse[]> {
    const [rows] = await pool.execute<WarehouseRow[]>(
      `SELECT id, name, display_order, created_at, updated_at
       FROM warehouses
       ORDER BY display_order ASC, id ASC`
    );
    
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      display_order: row.display_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }
}

