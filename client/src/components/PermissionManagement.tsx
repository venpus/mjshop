import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 리소스 정의 및 한국어 이름 매핑
const RESOURCES: { key: string; label: string; group: string }[] = [
  // 중국협업
  { key: 'purchase-orders', label: '발주 관리', group: '중국협업' },
  { key: 'shipping-history', label: '패킹리스트', group: '중국협업' },
  { key: 'payment-history', label: '결제내역', group: '중국협업' },
  { key: 'materials', label: '자재', group: '중국협업' },
  { key: 'projects', label: '프로젝트 관리', group: '중국협업' },
  { key: 'gallery', label: '갤러리', group: '중국협업' },
  { key: 'china-warehouse', label: '중국 입출고 현황', group: '중국협업' },
  { key: 'invoice', label: '정상 인보이스', group: '중국협업' },
  { key: 'packaging-work', label: '포장작업 관리', group: '중국협업' },
  // 쇼핑몰 관리
  { key: 'orders', label: '주문 관리', group: '쇼핑몰 관리' },
  { key: 'shipping', label: '배송 관리', group: '쇼핑몰 관리' },
  { key: 'payment', label: '결제 관리', group: '쇼핑몰 관리' },
  { key: 'inventory', label: '재고 관리', group: '쇼핑몰 관리' },
  // 기타
  { key: 'members', label: '회원 관리', group: '기타' },
  { key: 'admin-account', label: '관리자 계정 관리', group: '기타' },
];

const ADMIN_LEVELS: { value: string; label: string }[] = [
  { value: 'A-SuperAdmin', label: 'A레벨' },
  { value: 'B0: 중국Admin', label: 'B0레벨' },
  { value: 'C0: 한국Admin', label: 'C0레벨' },
];

interface PermissionData {
  resource: string;
  level: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

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

export function PermissionManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';

  const [permissions, setPermissions] = useState<ResourcePermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 권한 데이터 로드
  const loadPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '권한 설정을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setPermissions(data.data);
      } else {
        throw new Error('데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '권한 설정을 불러오는 중 오류가 발생했습니다.');
      console.error('권한 설정 로드 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadPermissions();
    }
  }, [isSuperAdmin]);

  // 권한 데이터 초기화 (서버에 데이터가 없을 경우)
  const initializePermissions = (): ResourcePermissions[] => {
    const resourceMap = new Map<string, ResourcePermissions>();

    RESOURCES.forEach(resource => {
      resourceMap.set(resource.key, {
        resource: resource.key,
        permissions: {},
      });
    });

    // 서버에서 받은 데이터로 업데이트
    permissions.forEach(perm => {
      if (resourceMap.has(perm.resource)) {
        resourceMap.set(perm.resource, perm);
      }
    });

    return Array.from(resourceMap.values());
  };

  // 표시할 권한 데이터 (모든 리소스 포함)
  const displayPermissions = React.useMemo(() => {
    const resourceMap = new Map<string, ResourcePermissions>();

    // 모든 리소스 초기화
    RESOURCES.forEach(resource => {
      resourceMap.set(resource.key, {
        resource: resource.key,
        permissions: {},
      });
    });

    // 서버에서 받은 데이터로 업데이트
    permissions.forEach(perm => {
      if (resourceMap.has(perm.resource)) {
        resourceMap.set(perm.resource, perm);
      }
    });

    return Array.from(resourceMap.values());
  }, [permissions]);

  // 권한 값 가져오기
  const getPermission = (resource: string, level: string, type: 'read' | 'write' | 'delete'): boolean => {
    const resourcePerm = displayPermissions.find(p => p.resource === resource);
    if (!resourcePerm || !resourcePerm.permissions[level]) {
      return false;
    }
    return resourcePerm.permissions[level][`can_${type}`];
  };

  // 권한 값 설정
  const setPermission = (resource: string, level: string, type: 'read' | 'write' | 'delete', value: boolean) => {
    setPermissions(prev => {
      const newPermissions = [...prev];
      const resourceIndex = newPermissions.findIndex(p => p.resource === resource);
      
      if (resourceIndex === -1) {
        // 새로 추가
        const existingPerm = displayPermissions.find(p => p.resource === resource);
        const existingLevelPerm = existingPerm?.permissions[level] || {
          can_read: false,
          can_write: false,
          can_delete: false,
        };
        
        newPermissions.push({
          resource,
          permissions: {
            [level]: {
              ...existingLevelPerm,
              [`can_${type}`]: value,
            },
          },
        });
      } else {
        // 기존 항목 업데이트
        const resourcePerm = { ...newPermissions[resourceIndex] };
        const existingLevelPerm = resourcePerm.permissions[level] || {
          can_read: false,
          can_write: false,
          can_delete: false,
        };
        
        resourcePerm.permissions = {
          ...resourcePerm.permissions,
          [level]: {
            ...existingLevelPerm,
            [`can_${type}`]: value,
          },
        };
        newPermissions[resourceIndex] = resourcePerm;
      }
      
      return newPermissions;
    });
  };

  // 특정 레벨과 권한 타입에 대한 전체 선택 상태 확인
  const isAllSelected = (level: string, type: 'read' | 'write' | 'delete'): boolean => {
    const allSelected = RESOURCES.every(resource => getPermission(resource.key, level, type));
    return allSelected && RESOURCES.length > 0;
  };

  // 특정 레벨과 권한 타입에 대한 부분 선택 상태 확인
  const isIndeterminate = (level: string, type: 'read' | 'write' | 'delete'): boolean => {
    const selectedCount = RESOURCES.filter(resource => getPermission(resource.key, level, type)).length;
    return selectedCount > 0 && selectedCount < RESOURCES.length;
  };

  // 특정 레벨과 권한 타입에 대한 전체 선택/해제
  const toggleAllPermissions = (level: string, type: 'read' | 'write' | 'delete') => {
    const shouldSelect = !isAllSelected(level, type);
    RESOURCES.forEach(resource => {
      setPermission(resource.key, level, type, shouldSelect);
    });
  };

  // 권한 저장
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 저장할 데이터 변환 (모든 리소스와 레벨 조합)
      const settings: PermissionData[] = [];
      RESOURCES.forEach(resource => {
        ADMIN_LEVELS.forEach(level => {
          settings.push({
            resource: resource.key,
            level: level.value,
            can_read: getPermission(resource.key, level.value, 'read'),
            can_write: getPermission(resource.key, level.value, 'write'),
            can_delete: getPermission(resource.key, level.value, 'delete'),
          });
        });
      });

      const response = await fetch(`${API_BASE_URL}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '권한 설정 저장에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('권한 설정이 저장되었습니다.');
        await loadPermissions(); // 서버에서 다시 로드
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('권한 설정 저장에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '권한 설정 저장 중 오류가 발생했습니다.');
      console.error('권한 설정 저장 오류:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 그룹별로 리소스 분류
  const groupedResources = RESOURCES.reduce((acc, resource) => {
    if (!acc[resource.group]) {
      acc[resource.group] = [];
    }
    acc[resource.group].push(resource);
    return acc;
  }, {} as Record<string, typeof RESOURCES>);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 min-h-[1080px]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 font-medium">권한이 없습니다.</p>
          <p className="text-red-600 text-sm mt-2">A레벨 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">권한 관리</h2>
        <p className="text-gray-600">
          각 레벨 관리자별로 메뉴 및 기능에 대한 접근 권한을 설정할 수 있습니다.
        </p>
      </div>

      {/* 메시지 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>저장 중...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>저장</span>
            </>
          )}
        </button>
      </div>

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">권한 설정을 불러오는 중...</p>
          </div>
        </div>
      ) : (
        /* 권한 매트릭스 테이블 */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">
                    리소스
                  </th>
                  {ADMIN_LEVELS.map(level => (
                    <th key={level.value} className="px-6 py-4 text-center text-sm font-semibold text-gray-900" colSpan={3}>
                      {level.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50"></th>
                  {ADMIN_LEVELS.map(level => (
                    <React.Fragment key={level.value}>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 bg-gray-50">
                        <div className="flex flex-col items-center gap-1">
                          <span>읽기</span>
                          <input
                            type="checkbox"
                            checked={isAllSelected(level.value, 'read')}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate(level.value, 'read');
                            }}
                            onChange={() => toggleAllPermissions(level.value, 'read')}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            title="전체 선택"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 bg-gray-50">
                        <div className="flex flex-col items-center gap-1">
                          <span>쓰기</span>
                          <input
                            type="checkbox"
                            checked={isAllSelected(level.value, 'write')}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate(level.value, 'write');
                            }}
                            onChange={() => toggleAllPermissions(level.value, 'write')}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            title="전체 선택"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 bg-gray-50">
                        <div className="flex flex-col items-center gap-1">
                          <span>삭제</span>
                          <input
                            type="checkbox"
                            checked={isAllSelected(level.value, 'delete')}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate(level.value, 'delete');
                            }}
                            onChange={() => toggleAllPermissions(level.value, 'delete')}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            title="전체 선택"
                          />
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(groupedResources).map(([group, resources]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-gray-100">
                      <td colSpan={10} className="px-6 py-3 text-sm font-semibold text-gray-900">
                        {group}
                      </td>
                    </tr>
                    {resources.map(resource => {
                      const resourcePerm = displayPermissions.find(p => p.resource === resource.key);
                      return (
                        <tr key={resource.key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {resource.label}
                          </td>
                          {ADMIN_LEVELS.map(level => (
                            <React.Fragment key={level.value}>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={getPermission(resource.key, level.value, 'read')}
                                  onChange={(e) => setPermission(resource.key, level.value, 'read', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={getPermission(resource.key, level.value, 'write')}
                                  onChange={(e) => setPermission(resource.key, level.value, 'write', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={getPermission(resource.key, level.value, 'delete')}
                                  onChange={(e) => setPermission(resource.key, level.value, 'delete', e.target.checked)}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

