import { pool } from '../config/database.js';
import { AdminAccount, CreateAdminAccountDTO, UpdateAdminAccountDTO } from '../models/adminAccount.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 데이터베이스에서 조회한 결과 타입
interface AdminAccountRow extends RowDataPacket {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  is_active: number; // MySQL에서 boolean은 0/1로 반환됨
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export class AdminAccountRepository {
  /**
   * 모든 관리자 계정 조회
   */
  async findAll(): Promise<AdminAccount[]> {
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, name, phone, email, level, is_active, last_login_at, 
              created_at, updated_at, created_by, updated_by
       FROM admin_accounts
       ORDER BY created_at DESC`
    );
    
    return rows.map(this.mapRowToAccount);
  }

  /**
   * ID로 관리자 계정 조회
   */
  async findById(id: string): Promise<AdminAccount | null> {
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, name, phone, email, level, is_active, last_login_at, 
              created_at, updated_at, created_by, updated_by
       FROM admin_accounts
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToAccount(rows[0]);
  }

  /**
   * 이메일로 관리자 계정 조회
   */
  async findByEmail(email: string): Promise<AdminAccount | null> {
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, name, phone, email, level, is_active, last_login_at, 
              created_at, updated_at, created_by, updated_by
       FROM admin_accounts
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToAccount(rows[0]);
  }

  /**
   * 검색어로 관리자 계정 검색
   */
  async search(searchTerm: string): Promise<AdminAccount[]> {
    const searchPattern = `%${searchTerm}%`;
    const [rows] = await pool.execute<AdminAccountRow[]>(
      `SELECT id, name, phone, email, level, is_active, last_login_at, 
              created_at, updated_at, created_by, updated_by
       FROM admin_accounts
       WHERE id LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY created_at DESC`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );

    return rows.map(this.mapRowToAccount);
  }

  /**
   * 비밀번호 해시 조회 (인증용)
   */
  async findPasswordHashById(id: string): Promise<string | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT password_hash FROM admin_accounts WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].password_hash;
  }

  /**
   * 새 관리자 계정 생성
   */
  async create(data: CreateAdminAccountDTO, passwordHash: string): Promise<AdminAccount> {
    const { id, name, phone, email, level, created_by } = data;

    // level이 없으면 기본값 설정
    const accountLevel = level || 'C0: 한국Admin';

    await pool.execute<ResultSetHeader>(
      `INSERT INTO admin_accounts 
       (id, name, phone, email, password_hash, level, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, email, passwordHash, accountLevel, created_by || null]
    );

    const account = await this.findById(id);
    if (!account) {
      throw new Error('계정 생성 후 조회 실패');
    }

    return account;
  }

  /**
   * 관리자 가입 신청 (승인 대기 상태로 생성, is_active = false)
   */
  async createSignupRequest(data: CreateAdminAccountDTO, passwordHash: string): Promise<AdminAccount> {
    const { id, name, phone, email, level } = data;

    // level이 없으면 기본값 설정
    const accountLevel = level || 'C0: 한국Admin';

    await pool.execute<ResultSetHeader>(
      `INSERT INTO admin_accounts 
       (id, name, phone, email, password_hash, level, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, email, passwordHash, accountLevel, 0, null] // is_active = false (0)
    );

    const account = await this.findById(id);
    if (!account) {
      throw new Error('계정 생성 후 조회 실패');
    }

    return account;
  }

  /**
   * 관리자 계정 수정
   */
  async update(id: string, data: UpdateAdminAccountDTO, passwordHash?: string): Promise<AdminAccount | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (passwordHash) {
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }
    if (data.level !== undefined) {
      updates.push('level = ?');
      values.push(data.level);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active ? 1 : 0);
    }
    if (data.updated_by !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.execute<ResultSetHeader>(
      `UPDATE admin_accounts 
       SET ${updates.join(', ')}
       WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 관리자 계정 삭제
   */
  async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM admin_accounts WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  /**
   * ID 중복 확인
   */
  async existsById(id: string): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM admin_accounts WHERE id = ? LIMIT 1`,
      [id]
    );

    return rows.length > 0;
  }

  /**
   * 이메일 중복 확인
   */
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    if (excludeId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1 FROM admin_accounts WHERE email = ? AND id != ? LIMIT 1`,
        [email, excludeId]
      );
      return rows.length > 0;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM admin_accounts WHERE email = ? LIMIT 1`,
      [email]
    );

    return rows.length > 0;
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  async updateLastLogin(id: string): Promise<void> {
    await pool.execute<ResultSetHeader>(
      `UPDATE admin_accounts SET last_login_at = NOW() WHERE id = ?`,
      [id]
    );
  }

  /**
   * 데이터베이스 행을 AdminAccount 객체로 변환
   */
  private mapRowToAccount(row: AdminAccountRow): AdminAccount {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      level: row.level as AdminAccount['level'],
      is_active: Boolean(row.is_active),
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }
}

