import { pool } from '../config/database.js';
import { PermissionSetting, PermissionSettingDTO, ResourcePermissions } from '../models/permission.js';
import { AdminLevel } from '../models/adminAccount.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 데이터베이스에서 조회한 결과 타입
interface PermissionSettingRow extends RowDataPacket {
  id: number;
  resource: string;
  level: string;
  can_read: number; // MySQL에서 boolean은 0/1로 반환됨
  can_write: number;
  can_delete: number;
  created_at: Date;
  updated_at: Date;
}

export class PermissionRepository {
  /**
   * RowDataPacket을 PermissionSetting으로 변환
   */
  private mapRowToPermission(row: PermissionSettingRow): PermissionSetting {
    return {
      id: row.id,
      resource: row.resource,
      level: row.level as AdminLevel,
      can_read: Boolean(row.can_read),
      can_write: Boolean(row.can_write),
      can_delete: Boolean(row.can_delete),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * 모든 권한 설정 조회
   */
  async findAll(): Promise<PermissionSetting[]> {
    const [rows] = await pool.execute<PermissionSettingRow[]>(
      `SELECT id, resource, level, can_read, can_write, can_delete, created_at, updated_at
       FROM permission_settings
       ORDER BY resource, level`
    );
    
    return rows.map(this.mapRowToPermission);
  }

  /**
   * 리소스별로 그룹화된 권한 설정 조회
   */
  async findAllGroupedByResource(): Promise<ResourcePermissions[]> {
    const permissions = await this.findAll();
    
    // 리소스별로 그룹화
    const resourceMap = new Map<string, ResourcePermissions>();
    
    permissions.forEach(permission => {
      if (!resourceMap.has(permission.resource)) {
        resourceMap.set(permission.resource, {
          resource: permission.resource,
          permissions: {},
        });
      }
      
      const resourcePerms = resourceMap.get(permission.resource)!;
      resourcePerms.permissions[permission.level] = {
        can_read: permission.can_read,
        can_write: permission.can_write,
        can_delete: permission.can_delete,
      };
    });
    
    return Array.from(resourceMap.values());
  }

  /**
   * 특정 리소스의 권한 설정 조회
   */
  async findByResource(resource: string): Promise<PermissionSetting[]> {
    const [rows] = await pool.execute<PermissionSettingRow[]>(
      `SELECT id, resource, level, can_read, can_write, can_delete, created_at, updated_at
       FROM permission_settings
       WHERE resource = ?
       ORDER BY level`,
      [resource]
    );
    
    return rows.map(this.mapRowToPermission);
  }

  /**
   * 특정 리소스와 레벨의 권한 설정 조회
   */
  async findByResourceAndLevel(resource: string, level: AdminLevel): Promise<PermissionSetting | null> {
    const [rows] = await pool.execute<PermissionSettingRow[]>(
      `SELECT id, resource, level, can_read, can_write, can_delete, created_at, updated_at
       FROM permission_settings
       WHERE resource = ? AND level = ?`,
      [resource, level]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPermission(rows[0]);
  }

  /**
   * 권한 설정 생성 또는 업데이트 (UPSERT)
   */
  async upsert(data: PermissionSettingDTO): Promise<PermissionSetting> {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO permission_settings (resource, level, can_read, can_write, can_delete)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         can_read = VALUES(can_read),
         can_write = VALUES(can_write),
         can_delete = VALUES(can_delete),
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.resource,
        data.level,
        data.can_read ? 1 : 0,
        data.can_write ? 1 : 0,
        data.can_delete ? 1 : 0,
      ]
    );
    
    const permission = await this.findByResourceAndLevel(data.resource, data.level);
    if (!permission) {
      throw new Error('권한 설정 저장 후 조회에 실패했습니다.');
    }
    
    return permission;
  }

  /**
   * 여러 권한 설정 일괄 저장
   */
  async upsertMany(settings: PermissionSettingDTO[]): Promise<void> {
    if (settings.length === 0) {
      return;
    }

    // 트랜잭션 시작
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const setting of settings) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO permission_settings (resource, level, can_read, can_write, can_delete)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             can_read = VALUES(can_read),
             can_write = VALUES(can_write),
             can_delete = VALUES(can_delete),
             updated_at = CURRENT_TIMESTAMP`,
          [
            setting.resource,
            setting.level,
            setting.can_read ? 1 : 0,
            setting.can_write ? 1 : 0,
            setting.can_delete ? 1 : 0,
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 특정 리소스의 모든 권한 설정 삭제
   */
  async deleteByResource(resource: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM permission_settings WHERE resource = ?`,
      [resource]
    );

    return result.affectedRows > 0;
  }

  /**
   * 특정 리소스와 레벨의 권한 설정 삭제
   */
  async deleteByResourceAndLevel(resource: string, level: AdminLevel): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM permission_settings WHERE resource = ? AND level = ?`,
      [resource, level]
    );

    return result.affectedRows > 0;
  }
}

