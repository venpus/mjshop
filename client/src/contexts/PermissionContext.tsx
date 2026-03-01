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
  /** 발주 상세 비용 입력(기본단가, 배송비, 부자재 일반, 인건비 일반, 추가단가, 수량, 수수료율, 선금 비율) 가능 여부 - 허용 사용자(venpus 등)만 true */
  canEditPurchaseOrderCost: boolean;
  reloadPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ResourcePermissions[]>([]);
  const [canEditPurchaseOrderCost, setCanEditPurchaseOrderCost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 권한 데이터 및 비용 입력 권한 로드
  const loadPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setCanEditPurchaseOrderCost(false);
      setIsLoading(false);
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user.id) {
      headers['X-User-Id'] = user.id;
    }

    try {
      const [permRes, costRes] = await Promise.all([
        fetch(`${API_BASE_URL}/permissions`, {
          method: 'GET',
          headers,
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/permissions/can-edit-purchase-order-cost`, {
          method: 'GET',
          headers,
          credentials: 'include',
        }),
      ]);

      if (permRes.ok) {
        const data = await permRes.json();
        if (data.success && data.data) {
          setPermissions(data.data);
        } else {
          setPermissions([]);
        }
      } else {
        setPermissions([]);
      }

      if (costRes.ok) {
        const data = await costRes.json();
        setCanEditPurchaseOrderCost(data.success && data.data?.allowed === true);
      } else {
        setCanEditPurchaseOrderCost(false);
      }
    } catch (error) {
      console.error('권한 설정 로드 오류:', error);
      setPermissions([]);
      setCanEditPurchaseOrderCost(false);
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
      return false;
    }

    // A-SuperAdmin은 모든 권한 허용
    if (user.level === 'A-SuperAdmin') {
      return true;
    }

    const resourcePerm = permissions.find(p => p.resource === resource);
    if (!resourcePerm) {
      return false; // 권한 설정이 없으면 기본적으로 차단
    }

    const levelPerm = resourcePerm.permissions[user.level];
    if (!levelPerm) {
      return false; // 해당 레벨의 권한 설정이 없으면 차단
    }

    return Boolean(levelPerm[`can_${permissionType}`]);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isLoading,
        hasPermission,
        canEditPurchaseOrderCost,
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

