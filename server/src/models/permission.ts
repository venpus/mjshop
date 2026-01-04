// 권한 설정 타입 정의

import { AdminLevel } from './adminAccount';

export interface PermissionSetting {
  id: number;
  resource: string;
  level: AdminLevel;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  created_at: Date;
  updated_at: Date;
}

// 클라이언트에 전달할 때 사용하는 형식
export interface PermissionSettingPublic {
  resource: string;
  level: AdminLevel;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

// 리소스별 권한 설정 (레벨별로 그룹화)
export interface ResourcePermissions {
  resource: string;
  permissions: {
    [level in AdminLevel]?: {
      can_read: boolean;
      can_write: boolean;
      can_delete: boolean;
    };
  };
}

// 권한 설정 저장 시 사용하는 DTO
export interface PermissionSettingDTO {
  resource: string;
  level: AdminLevel;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

// 모든 권한 설정 저장 시 사용하는 DTO (배열)
export interface PermissionSettingsDTO {
  settings: PermissionSettingDTO[];
}

