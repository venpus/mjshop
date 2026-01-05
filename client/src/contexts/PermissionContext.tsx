import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 권한 데이터 타입
interface ResourcePermissions {
  resource: string;
  permissions: {
    [level: string]: {
      can_read: boolean;
      can_write: boolean;
      can_delete: boolean;
    };
  };
}

interface PermissionContextType {
  permissions: ResourcePermissions[];
  isLoading: boolean;
  hasPermission: (resource: string, permissionType: 'read' | 'write' | 'delete') => boolean;
  reloadPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ResourcePermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 권한 데이터 로드
  const loadPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('권한 설정 조회 실패');
        setPermissions([]);
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        console.log('[PermissionContext] 권한 데이터 로드 완료:', data.data);
        setPermissions(data.data);
      } else {
        console.log('[PermissionContext] 권한 데이터 로드 실패:', data);
        setPermissions([]);
      }
    } catch (error) {
      console.error('권한 설정 로드 오류:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 로그인 시 권한 로드
  useEffect(() => {
    loadPermissions();
  }, [user]);

  // 권한 체크 함수
  const hasPermission = (resource: string, permissionType: 'read' | 'write' | 'delete'): boolean => {
    if (!user) {
      console.log('[PermissionContext] hasPermission: user가 없음');
      return false;
    }

    // A-SuperAdmin은 모든 권한 허용
    if (user.level === 'A-SuperAdmin') {
      console.log('[PermissionContext] hasPermission: A-SuperAdmin - 모든 권한 허용');
      return true;
    }

    const resourcePerm = permissions.find(p => p.resource === resource);
    if (!resourcePerm) {
      console.log(`[PermissionContext] hasPermission: ${resource} 리소스 권한 설정 없음`);
      console.log('[PermissionContext] 현재 권한 데이터:', permissions);
      return false; // 권한 설정이 없으면 기본적으로 차단
    }

    const levelPerm = resourcePerm.permissions[user.level];
    if (!levelPerm) {
      console.log(`[PermissionContext] hasPermission: ${user.level} 레벨의 ${resource} 권한 설정 없음`);
      return false; // 해당 레벨의 권한 설정이 없으면 차단
    }

    const result = levelPerm[`can_${permissionType}`];
    console.log(`[PermissionContext] hasPermission: ${resource}.${permissionType} = ${result}`);
    return result;
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isLoading,
        hasPermission,
        reloadPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

