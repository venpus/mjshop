import { PermissionRepository } from '../repositories/permissionRepository.js';
import {
  PermissionSetting,
  PermissionSettingDTO,
  PermissionSettingsDTO,
  ResourcePermissions,
} from '../models/permission.js';

export class PermissionService {
  private repository: PermissionRepository;

  constructor() {
    this.repository = new PermissionRepository();
  }

  /**
   * 모든 권한 설정 조회 (리소스별로 그룹화)
   */
  async getAllPermissions(): Promise<ResourcePermissions[]> {
    return await this.repository.findAllGroupedByResource();
  }

  /**
   * 권한 설정 저장 (여러 개 일괄 저장)
   */
  async savePermissions(data: PermissionSettingsDTO): Promise<void> {
    await this.repository.upsertMany(data.settings);
  }

  /**
   * 단일 권한 설정 저장
   */
  async savePermission(data: PermissionSettingDTO): Promise<PermissionSetting> {
    return await this.repository.upsert(data);
  }
}

