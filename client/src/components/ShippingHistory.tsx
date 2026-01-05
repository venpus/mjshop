import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PackageSearch, Plus, Edit, Trash2, Save, Filter, X } from 'lucide-react';
import { SearchBar } from './ui/search-bar';
import { PackingListCreateModal, type PackingListFormData } from './PackingListCreateModal';
import { useAuth } from '../contexts/AuthContext';
import { GalleryImageModal } from './GalleryImageModal';
import { PackingListTable } from './packing-list/PackingListTable';
import { usePackingListSelection } from '../hooks/usePackingListSelection';
import { convertItemToFormData, getGroupId } from '../utils/packingListUtils';
import type { PackingListItem } from './packing-list/types';
import { LOGISTICS_COMPANIES } from './packing-list/types';
import {
  getAllPackingLists,
  getPackingListsByMonth,
  createPackingList, 
  updatePackingList, 
  createPackingListItem, 
  deletePackingListItem, 
  getPackingListById, 
  updatePackingListItem,
  createDomesticInvoice,
  updateDomesticInvoice,
  deleteDomesticInvoice,
  createKoreaArrival,
  updateKoreaArrival,
  deleteKoreaArrival,
  deletePackingList,
} from '../api/packingListApi';
import { transformServerToClient, transformFormDataProductsToItems, transformFormDataToServerRequest, getPackingListIdFromCode } from '../utils/packingListTransform';

export function ShippingHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  // D0 레벨 체크 (실제 값은 'D0: 비전 담당자')
  const isD0Level = user?.level === 'D0: 비전 담당자';
  // C0 레벨 체크
  const isC0Level = user?.level === 'C0: 한국Admin';
  // A레벨, C0 레벨, D0 레벨만 코드 링크 표시
  const showCodeLink = user?.level === 'A-SuperAdmin' || isC0Level || isD0Level;
  // C0 레벨, D0 레벨일 때 실중량, 비율, 중량, 배송비, 지급일, WK결제일 숨김
  const hideSensitiveColumns = isC0Level || isD0Level;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCodeDate, setEditingCodeDate] = useState<string | null>(null); // code-date 조합
  const [packingListItems, setPackingListItems] = useState<PackingListItem[]>([]);
  const [originalPackingListItems, setOriginalPackingListItems] = useState<PackingListItem[]>([]); // 원본 데이터 (변경 감지용)
  const [selectedInvoiceImage, setSelectedInvoiceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false); // 변경사항이 있는지 여부
  const [isSaving, setIsSaving] = useState(false); // 저장 중인지 여부
  
  // 월별 필터 상태
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(
    `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
  );
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false); // 전체 보기 옵션
  
  // 선택된 년/월 파싱
  const [selectedYear, selectedMonth] = selectedYearMonth.split('-').map(Number);
  
  // 검색/필터 상태
  const [inputSearchTerm, setInputSearchTerm] = useState(''); // 입력 필드에 표시되는 검색어
  const [searchTerm, setSearchTerm] = useState(''); // 실제 검색에 사용되는 검색어
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    logisticsCompanies: [] as string[],
    dateRange: {
      startDate: '',
      endDate: ''
    },
    status: [] as string[], // 내륙운송중, 배송중, 한국도착
  });
  
  // location state에서 initialPackingListData 확인 (공장→물류창고에서 전달된 데이터)
  useEffect(() => {
    const state = location.state as { initialPackingListData?: PackingListFormData } | null;
    if (state?.initialPackingListData) {
      setIsCreateModalOpen(true);
      // state를 클리어하여 다시 로드 시 중복 실행 방지
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 선택 상태 관리 훅
  const {
    selectedCodes, // 하위 호환성을 위해 유지 (실제로는 사용하지 않음)
    selectedKeys, // 코드-날짜 조합 Set
    toggleCode,
    toggleAllCodes,
    isAllSelected,
    isCodeSelected,
    clearSelection,
  } = usePackingListSelection(packingListItems);

  // 데이터 로드
  const loadPackingLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      console.log('[ShippingHistory] 데이터 로드 시작 - 사용자 레벨:', user?.level);
      console.log('[ShippingHistory] 조회 조건 - yearMonth:', selectedYearMonth, 'showAllMonths:', showAllMonths);
      
      // 월별 조회 또는 전체 조회
      const packingListsPromise = showAllMonths
        ? getAllPackingLists()
        : getPackingListsByMonth(selectedYear, selectedMonth);
      
      // 패킹리스트와 발주 목록을 병렬로 로드
      const [serverData, purchaseOrdersResponse] = await Promise.all([
        packingListsPromise,
        fetch(`${API_BASE_URL}/purchase-orders`, {
          credentials: 'include',
        }),
      ]);
      
      console.log('[ShippingHistory] 패킹리스트 데이터 로드 완료:', Array.isArray(serverData) ? `${serverData.length}개` : '데이터 없음');
      
      // 발주 목록 파싱
      let purchaseOrders: Array<{ id: string; product_main_image: string | null }> = [];
      if (purchaseOrdersResponse.ok) {
        const purchaseOrdersData = await purchaseOrdersResponse.json();
        if (purchaseOrdersData.success) {
          purchaseOrders = (purchaseOrdersData.data || []).map((po: any) => ({
            id: po.id,
            product_main_image: po.product_main_image || null,
          }));
        }
      } else {
        console.warn('[ShippingHistory] 발주 목록 로드 실패:', purchaseOrdersResponse.status);
      }
      
      const transformedItems = transformServerToClient(serverData, purchaseOrders);
      console.log('[ShippingHistory] 변환된 아이템 수:', transformedItems.length);
      setPackingListItems(transformedItems);
      setOriginalPackingListItems(JSON.parse(JSON.stringify(transformedItems))); // 깊은 복사로 원본 저장
      setIsDirty(false); // 로드 후 변경사항 없음
    } catch (err: any) {
      console.error('[ShippingHistory] 패킹리스트 로드 오류:', err);
      console.error('[ShippingHistory] 오류 상세:', {
        message: err.message,
        stack: err.stack,
        userLevel: user?.level,
      });
      setError(err.message || '패킹리스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYearMonth, showAllMonths, user?.level]);

  useEffect(() => {
    loadPackingLists();
  }, [loadPackingLists]);

  // 필터 옵션 동적 추출
  const filterOptions = useMemo(() => {
    const logisticsCompaniesSet = new Set<string>();
    
    // D0 레벨 관리자는 "광저우-비전"과 "위해-비전"만 필터 옵션에 표시
    if (isD0Level) {
      logisticsCompaniesSet.add('광저우-비전');
      logisticsCompaniesSet.add('위해-비전');
    } else {
      // 먼저 정의된 모든 물류회사 추가
      LOGISTICS_COMPANIES.forEach(company => {
        logisticsCompaniesSet.add(company);
      });
      
      // 실제 데이터에서도 물류회사 추가 (정의되지 않은 것도 포함하기 위해)
      packingListItems.forEach(item => {
        if (item.isFirstRow && item.logisticsCompany) {
          logisticsCompaniesSet.add(item.logisticsCompany);
        }
      });
    }
    
    return {
      logisticsCompanies: Array.from(logisticsCompaniesSet).sort(),
    };
  }, [packingListItems, user]);

  // 검색 실행 핸들러 (엔터키 또는 검색 버튼 클릭 시)
  const handleSearch = () => {
    const trimmedSearch = inputSearchTerm.trim();
    setSearchTerm(trimmedSearch);
  };

  // 입력 필드 변경 핸들러 (실제 검색은 실행하지 않음)
  const handleSearchInputChange = (value: string) => {
    setInputSearchTerm(value);
  };

  // 엔터키 입력 핸들러
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 필터 토글 핸들러
  const toggleFilter = (category: 'logisticsCompanies' | 'status', value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: newValues };
    });
  };

  // 날짜 범위 필터 변경 핸들러
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value,
      },
    }));
  };

  // 모든 필터 초기화
  const clearAllFilters = () => {
    setFilters({
      logisticsCompanies: [],
      dateRange: {
        startDate: '',
        endDate: '',
      },
      status: [],
    });
  };

  // 활성 필터 개수
  const activeFilterCount = useMemo(() => {
    let count = filters.logisticsCompanies.length + filters.status.length;
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      count += 1;
    }
    return count;
  }, [filters]);

  // 필터링된 패킹리스트 아이템
  const filteredPackingListItems = useMemo(() => {
    let filtered = packingListItems;

    // D0 레벨 관리자는 물류회사가 "광저우-비전" 또는 "위해-비전"인 목록만 표시
    if (isD0Level) {
      const filteredGroupIds = new Set<string>();
      
      // 그룹별로 분류하여 물류회사 확인
      const groupMap = new Map<string, PackingListItem[]>();
      packingListItems.forEach(item => {
        const groupId = getGroupId(item.id);
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, []);
        }
        groupMap.get(groupId)!.push(item);
      });
      
      groupMap.forEach((items, groupId) => {
        // 그룹의 첫 번째 아이템에서 물류회사 가져오기
        const firstItem = items.find(item => item.isFirstRow);
        if (!firstItem) return;
        
        // 물류회사가 "광저우-비전" 또는 "위해-비전"인 경우만 포함
        // 물류회사가 null, undefined, 빈 문자열인 경우는 제외
        const logisticsCompany = firstItem.logisticsCompany?.trim();
        if (logisticsCompany === '광저우-비전' || logisticsCompany === '위해-비전') {
          filteredGroupIds.add(groupId);
        }
      });
      
      // 필터링된 그룹에 속한 아이템만 포함
      filtered = filtered.filter(item => {
        const groupId = getGroupId(item.id);
        return filteredGroupIds.has(groupId);
      });
    }

    // 검색어 필터
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        // 코드 검색
        if (item.code.toLowerCase().includes(searchLower)) return true;
        // 물류회사 검색 (첫 번째 행만 체크)
        if (item.isFirstRow && item.logisticsCompany?.toLowerCase().includes(searchLower)) return true;
        // 제품명 검색
        if (item.productName?.toLowerCase().includes(searchLower)) return true;
        return false;
      });
    }

    // 물류회사 필터 (D0 레벨이 아닐 때만 적용)
    if (!isD0Level && filters.logisticsCompanies.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.isFirstRow) return true; // 첫 번째 행만 체크
        return item.logisticsCompany ? filters.logisticsCompanies.includes(item.logisticsCompany) : false;
      });
    }

    // 날짜 범위 필터 (그룹 단위로 필터링)
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const filteredGroupIds = new Set<string>();
      
      // 원본 데이터 기준으로 그룹별로 분류하여 날짜 확인
      const groupMap = new Map<string, PackingListItem[]>();
      packingListItems.forEach(item => {
        const groupId = getGroupId(item.id);
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, []);
        }
        groupMap.get(groupId)!.push(item);
      });
      
      const startDateStr = filters.dateRange.startDate ? filters.dateRange.startDate : null;
      const endDateStr = filters.dateRange.endDate ? filters.dateRange.endDate : null;
      
      groupMap.forEach((items, groupId) => {
        // 그룹의 첫 번째 아이템에서 날짜 가져오기
        const firstItem = items.find(item => item.isFirstRow);
        if (!firstItem || !firstItem.date) return;
        
        // 날짜 문자열 직접 비교 (YYYY-MM-DD 형식이므로 문자열 비교로 시간대 문제 방지)
        const itemDateStr = firstItem.date.split('T')[0]; // 시간 부분 제거 (YYYY-MM-DD만 추출)
        
        let shouldInclude = true;
        
        // 시작일 체크: itemDate가 시작일보다 작으면 제외
        if (startDateStr && itemDateStr < startDateStr) {
          shouldInclude = false;
        }
        
        // 종료일 체크: itemDate가 종료일보다 크면 제외 (종료일 포함)
        if (shouldInclude && endDateStr && itemDateStr > endDateStr) {
          shouldInclude = false;
        }
        
        // 필터 조건을 만족하면 그룹 ID 추가
        if (shouldInclude) {
          filteredGroupIds.add(groupId);
        }
      });
      
      // 필터링된 그룹에 속한 아이템만 포함
      filtered = filtered.filter(item => {
        const groupId = getGroupId(item.id);
        return filteredGroupIds.has(groupId);
      });
    }

    // 상태 필터 (내륙운송중, 배송중, 한국도착)
    if (filters.status.length > 0) {
      const filteredGroupIds = new Set<string>();
      
      // 그룹별로 분류하여 상태 확인
      const groupMap = new Map<string, PackingListItem[]>();
      packingListItems.forEach(item => {
        const groupId = getGroupId(item.id);
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, []);
        }
        groupMap.get(groupId)!.push(item);
      });
      
      groupMap.forEach((items, groupId) => {
        // 그룹의 첫 번째 아이템에서 물류창고 도착일 가져오기
        const firstItem = items.find(item => item.isFirstRow);
        if (!firstItem) return;
        
        // 물류창고 도착일 확인
        const hasWarehouseArrivalDate = firstItem.warehouseArrivalDate && firstItem.warehouseArrivalDate.trim() !== '';
        
        // 한국도착일이 하나라도 있는지 확인 (그룹 내 모든 아이템 체크)
        const hasKoreaArrivalDate = items.some(item => 
          item.koreaArrivalDate && item.koreaArrivalDate.length > 0
        );
        
        let status = '';
        
        // 우선순위 1: 한국도착일이 하나라도 있으면 "한국도착"
        if (hasKoreaArrivalDate) {
          status = '한국도착';
        } 
        // 우선순위 2: 물류창고 도착일이 있으면 "배송중"
        else if (hasWarehouseArrivalDate) {
          status = '배송중';
        }
        // 우선순위 3: 물류창고 도착일이 없으면 "내륙운송중"
        else {
          status = '내륙운송중';
        }
        
        if (filters.status.includes(status)) {
          filteredGroupIds.add(groupId);
        }
      });
      
      filtered = filtered.filter(item => {
        const groupId = getGroupId(item.id);
        return filteredGroupIds.has(groupId);
      });
    }

    return filtered;
  }, [packingListItems, searchTerm, filters, user]);

  // 코드 클릭 시 패킹리스트 상세 화면으로 이동하는 핸들러
  const handleCodeClick = (code: string, date: string) => {
    // code와 date로 패킹리스트 ID 찾기
    const codeDateKey = `${code}-${date}`;
    const packingListId = getPackingListIdFromCode(packingListItems, codeDateKey);
    
    if (!packingListId) {
      alert('패킹리스트를 찾을 수 없습니다.');
      return;
    }
    
    // 패킹리스트 상세 화면으로 이동 (변경사항 확인)
    safeNavigate(`/admin/packing-lists/${packingListId}`);
  };

  const handleProductNameClick = (purchaseOrderId?: string) => {
    if (purchaseOrderId) {
      safeNavigate(`/admin/purchase-orders/${purchaseOrderId}`);
    }
  };

  const handleCreatePackingList = async (data: PackingListFormData) => {
    try {
      // 서버 API 형식으로 변환
      const items = transformFormDataProductsToItems(data);
      const { packingList } = transformFormDataToServerRequest(data, items);

      // 패킹리스트 생성
      const createdPackingList = await createPackingList(packingList);

      // 각 아이템 생성 (중간에 실패하면 이미 생성된 패킹리스트가 남을 수 있음)
      // 에러 발생 시 사용자에게 알림
      const createdItems: number[] = [];
      try {
        for (const item of items) {
          const createdItem = await createPackingListItem(createdPackingList.id, item);
          createdItems.push(createdItem.id);
        }
      } catch (itemError: any) {
        // 아이템 생성 중 오류 발생 시 사용자에게 알림
        console.error('패킹리스트 아이템 생성 오류:', itemError);
        alert(`패킹리스트는 생성되었지만 일부 아이템 생성에 실패했습니다: ${itemError.message || '알 수 없는 오류'}`);
        // 데이터 다시 로드하여 부분적으로 생성된 상태를 표시
        await loadPackingLists();
        setIsCreateModalOpen(false);
        return;
      }

      // 데이터 다시 로드
      await loadPackingLists();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('패킹리스트 생성 오류:', err);
      alert(err.message || '패킹리스트 생성에 실패했습니다.');
    }
  };

  const handleUpdatePackingList = async (data: PackingListFormData) => {
    if (!editingCodeDate) return;

    try {
      const packingListId = getPackingListIdFromCode(packingListItems, editingCodeDate);
      if (!packingListId) {
        alert('패킹리스트를 찾을 수 없습니다.');
        return;
      }

      // 서버 API 형식으로 변환
      const items = transformFormDataProductsToItems(data);
      const { packingList } = transformFormDataToServerRequest(data, items);

      // 기존 패킹리스트 정보 가져오기 (아이템 ID 확인용)
      const existingPackingList = await getPackingListById(packingListId);
      if (!existingPackingList) {
        alert('패킹리스트를 찾을 수 없습니다.');
        return;
      }

      // 패킹리스트 메인 정보 업데이트
      await updatePackingList(packingListId, packingList);

      // 기존 아이템 삭제
      // 참고: 내륙송장은 packing_list_id에 연결되어 있어 아이템 삭제와 무관하게 유지됩니다.
      // 한국도착일은 packing_list_item_id에 연결되어 있어 아이템 삭제 시 CASCADE로 삭제됩니다.
      if (existingPackingList.items) {
        for (const item of existingPackingList.items) {
          await deletePackingListItem(item.id);
        }
      }

      // 새로운 아이템 생성 (중간에 실패하면 이미 삭제된 아이템이 복구되지 않을 수 있음)
      // 에러 발생 시 사용자에게 알림
      try {
        for (const item of items) {
          await createPackingListItem(packingListId, item);
        }
      } catch (itemError: any) {
        // 아이템 생성 중 오류 발생 시 사용자에게 알림
        console.error('패킹리스트 아이템 생성 오류:', itemError);
        alert(`패킹리스트 정보는 업데이트되었지만 일부 아이템 생성에 실패했습니다: ${itemError.message || '알 수 없는 오류'}\n데이터를 다시 로드합니다.`);
        // 데이터 다시 로드
        await loadPackingLists();
        return;
      }

      // 데이터 다시 로드
      await loadPackingLists();
      setIsEditModalOpen(false);
      setEditingCodeDate(null);
      clearSelection();
    } catch (err: any) {
      console.error('패킹리스트 수정 오류:', err);
      alert(err.message || '패킹리스트 수정에 실패했습니다.');
    }
  };

  // 최신 상태를 참조하기 위한 ref
  const itemsRef = useRef<PackingListItem[]>([]);
  useEffect(() => {
    itemsRef.current = packingListItems;
  }, [packingListItems]);

  // 변경사항 감지 (원본 데이터와 비교)
  const checkForChanges = useCallback(() => {
    const hasChanges = JSON.stringify(packingListItems) !== JSON.stringify(originalPackingListItems);
    setIsDirty(hasChanges);
  }, [packingListItems, originalPackingListItems]);

  // packingListItems 변경 시 변경사항 감지
  useEffect(() => {
    if (originalPackingListItems.length > 0) {
      checkForChanges();
    }
  }, [packingListItems, originalPackingListItems, checkForChanges]);

  // 브라우저 닫기/새로고침 시 변경사항 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome에서 메시지 표시를 위해 필요
        return ''; // 일부 브라우저에서 필요
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // 안전한 네비게이션 함수 (변경사항이 있을 때 확인)
  const safeNavigate = useCallback((path: string) => {
    if (isDirty) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말로 이동하시겠습니까?\n\n변경사항은 저장되지 않습니다.'
      );
      if (!confirmed) {
        return false; // 이동 취소
      }
    }
    navigate(path);
    return true;
  }, [isDirty, navigate]);

  // 내륙송장 변경 핸들러 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleDomesticInvoiceChange = useCallback((groupId: string, invoices: import('./packing-list/types').DomesticInvoice[]) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리)
    setPackingListItems(prev => prev.map(item => {
      if (getGroupId(item.id) === groupId) {
        return { ...item, domesticInvoice: invoices };
      }
      return item;
    }));
  }, []);

  // 패킹리스트 삭제 핸들러
  const handleDeletePackingLists = useCallback(async () => {
    if (selectedKeys.size === 0) {
      return;
    }

    const confirmMessage = selectedKeys.size === 1
      ? `선택한 패킹리스트를 삭제하시겠습니까?\n\n삭제된 패킹리스트의 데이터는 복구할 수 없으며, 발주 관리 목록의 수량이 자동으로 업데이트됩니다.`
      : `${selectedKeys.size}개의 패킹리스트를 삭제하시겠습니까?\n\n삭제된 패킹리스트의 데이터는 복구할 수 없으며, 발주 관리 목록의 수량이 자동으로 업데이트됩니다.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const keysToDelete = Array.from(selectedKeys);
      const deletePromises = keysToDelete.map(async (codeDateKey) => {
        const packingListId = getPackingListIdFromCode(packingListItems, codeDateKey);
        if (!packingListId) {
          console.warn(`패킹리스트 ID를 찾을 수 없습니다: ${codeDateKey}`);
          return;
        }
        await deletePackingList(packingListId);
      });

      await Promise.all(deletePromises);
      
      // 선택 상태 초기화
      clearSelection();
      
      // 목록 새로고침
      await loadPackingLists();
      
      alert(selectedKeys.size === 1 
        ? '패킹리스트가 삭제되었습니다.' 
        : `${selectedKeys.size}개의 패킹리스트가 삭제되었습니다.`);
    } catch (error: any) {
      console.error('패킹리스트 삭제 오류:', error);
      alert(error.message || '패킹리스트 삭제 중 오류가 발생했습니다.');
    }
  }, [selectedKeys, packingListItems, clearSelection, loadPackingLists]);

  // 한국도착일 변경 핸들러 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleKoreaArrivalChange = useCallback((itemId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리) - 특정 아이템만 업데이트
    setPackingListItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, koreaArrivalDate: koreaArrivalDates };
      }
      return item;
    }));
  }, []);

  // 아이템 업데이트 헬퍼 함수 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleItemUpdate = useCallback((groupId: string, updater: (item: PackingListItem) => PackingListItem) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리)
    setPackingListItems(prev => {
      const updated = prev.map(item => {
        const itemGroupId = getGroupId(item.id);
        if (itemGroupId === groupId) {
          return updater(item);
        }
        return item;
      });
      // ref도 업데이트 (필요시 사용)
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  // 그룹이 변경되었는지 확인하는 함수
  const isGroupChanged = useCallback((groupId: string, currentItems: PackingListItem[], originalItems: PackingListItem[]): boolean => {
    const currentGroupItems = currentItems.filter(item => getGroupId(item.id) === groupId);
    const originalGroupItems = originalItems.filter(item => getGroupId(item.id) === groupId);
    
    if (currentGroupItems.length !== originalGroupItems.length) {
      return true; // 아이템 개수가 다르면 변경됨
    }
    
    const currentFirstItem = currentGroupItems.find(item => item.isFirstRow);
    const originalFirstItem = originalGroupItems.find(item => item.isFirstRow);
    
    if (!currentFirstItem || !originalFirstItem) {
      return false;
    }
    
    // 메인 필드 비교
    if (
      currentFirstItem.unit !== originalFirstItem.unit ||
      currentFirstItem.logisticsCompany !== originalFirstItem.logisticsCompany ||
      currentFirstItem.warehouseArrivalDate !== originalFirstItem.warehouseArrivalDate ||
      currentFirstItem.actualWeight !== originalFirstItem.actualWeight ||
      currentFirstItem.weightRatio !== originalFirstItem.weightRatio ||
      currentFirstItem.calculatedWeight !== originalFirstItem.calculatedWeight ||
      currentFirstItem.shippingCost !== originalFirstItem.shippingCost ||
      currentFirstItem.paymentDate !== originalFirstItem.paymentDate ||
      currentFirstItem.wkPaymentDate !== originalFirstItem.wkPaymentDate
    ) {
      return true;
    }
    
    // 내륙송장 비교
    const currentInvoices = JSON.stringify(currentFirstItem.domesticInvoice || []);
    const originalInvoices = JSON.stringify(originalFirstItem.domesticInvoice || []);
    if (currentInvoices !== originalInvoices) {
      return true;
    }
    
    // 각 아이템의 한국도착일 비교
    for (const currentItem of currentGroupItems) {
      const originalItem = originalGroupItems.find(item => item.id === currentItem.id);
      if (!originalItem) {
        return true; // 아이템이 없으면 변경됨
      }
      
      const currentKoreaArrivals = JSON.stringify(currentItem.koreaArrivalDate || []);
      const originalKoreaArrivals = JSON.stringify(originalItem.koreaArrivalDate || []);
      if (currentKoreaArrivals !== originalKoreaArrivals) {
        return true;
      }
    }
    
    return false;
  }, []);

  // 모든 변경사항 저장
  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      // 그룹별로 분류
      const groupMap = new Map<string, PackingListItem[]>();
      
      packingListItems.forEach(item => {
        const groupId = getGroupId(item.id);
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, []);
        }
        groupMap.get(groupId)!.push(item);
      });

      // 변경된 그룹만 필터링
      const changedGroups = Array.from(groupMap.entries()).filter(([groupId]) => {
        return isGroupChanged(groupId, packingListItems, originalPackingListItems);
      });

      // 변경된 그룹만 저장
      for (const [groupId, items] of changedGroups) {
        const firstItem = items.find(item => item.isFirstRow);
        if (!firstItem) continue;

        const parts = firstItem.id.split('-');
        const packingListId = parseInt(parts[0]);
        const itemId = parseInt(parts[1]);

        if (isNaN(packingListId) || isNaN(itemId)) {
          console.error('Invalid packing list ID or item ID:', firstItem.id);
          continue;
        }

        // 패킹리스트 아이템 업데이트 (unit)
        await updatePackingListItem(itemId, {
          unit: firstItem.unit,
        });

        // 패킹리스트 메인 필드 업데이트
        // weight_ratio 처리: 빈 문자열이면 null, 그 외에는 숫자로 변환
        let weightRatioValue: number | null | undefined = undefined;
        if (firstItem.weightRatio === '') {
          weightRatioValue = null;
        } else if (firstItem.weightRatio) {
          const numericValue = parseFloat(firstItem.weightRatio.replace('%', ''));
          weightRatioValue = isNaN(numericValue) ? null : numericValue;
        }
        // weight_ratio는 항상 업데이트해야 하므로 undefined가 아닌 값을 보장
        // undefined면 null로 설정하여 명시적으로 null로 업데이트
        if (weightRatioValue === undefined) {
          weightRatioValue = null;
        }
        
        await updatePackingList(packingListId, {
          logistics_company: firstItem.logisticsCompany || undefined,
          warehouse_arrival_date: firstItem.warehouseArrivalDate || undefined,
          actual_weight: firstItem.actualWeight ? parseFloat(firstItem.actualWeight) : undefined,
          weight_ratio: weightRatioValue,
          calculated_weight: firstItem.calculatedWeight ? parseFloat(firstItem.calculatedWeight) : undefined,
          shipping_cost: firstItem.shippingCost ? parseFloat(firstItem.shippingCost) : undefined,
          payment_date: firstItem.paymentDate || undefined,
          wk_payment_date: firstItem.wkPaymentDate || undefined,
        });

        // 내륙송장 업데이트
        const currentPackingList = await getPackingListById(packingListId);
        if (currentPackingList) {
          const currentInvoices = currentPackingList.items?.[0]?.domestic_invoices || [];
          
          // 새로운 내륙송장 생성 (송장번호가 없어도 사진이 있으면 생성)
          for (const invoice of firstItem.domesticInvoice) {
            if (!invoice.id && (invoice.number.trim() || (invoice.images && invoice.images.length > 0))) {
              const created = await createDomesticInvoice(packingListId, {
                invoice_number: invoice.number || '', // 송장번호가 없으면 빈 문자열
              });
              // 로컬 상태에 id 업데이트 (저장 후 다시 로드할 예정이지만, 일관성을 위해)
              setPackingListItems(prev => prev.map(item => {
                if (getGroupId(item.id) === groupId) {
                  return {
                    ...item,
                    domesticInvoice: item.domesticInvoice.map(inv => 
                      !inv.id && inv.number === invoice.number ? { ...inv, id: created.id } : inv
                    ),
                  };
                }
                return item;
              }));
            } else if (invoice.id) {
              // 기존 내륙송장 번호 수정
              const serverInvoice = currentInvoices.find(inv => inv.id === invoice.id);
              if (serverInvoice && serverInvoice.invoice_number !== invoice.number) {
                await updateDomesticInvoice(invoice.id, {
                  invoice_number: invoice.number,
                });
              }
            }
          }

          // 삭제된 내륙송장 제거
          for (const serverInvoice of currentInvoices) {
            const existsInClient = firstItem.domesticInvoice.some(inv => inv.id === serverInvoice.id);
            if (!existsInClient) {
              await deleteDomesticInvoice(serverInvoice.id);
            }
          }

          // 한국도착일 업데이트
          for (const item of items) {
            const itemId = parseInt(item.id.split('-')[1]);
            if (isNaN(itemId)) continue;

            const currentItem = currentPackingList.items?.find(i => i.id === itemId);
            const currentKoreaArrivals = currentItem?.korea_arrivals || [];
            const koreaArrivalDates = item.koreaArrivalDate || [];

            // 새로운 한국도착일 생성
            for (const arrival of koreaArrivalDates) {
              // date와 quantity가 모두 유효한지 확인
              const trimmedQuantity = arrival.quantity?.trim() || '';
              const quantityNum = parseInt(trimmedQuantity);
              const isValidQuantity = trimmedQuantity !== '' && !isNaN(quantityNum) && quantityNum > 0;
              
              if (!arrival.id && arrival.date && isValidQuantity) {
                await createKoreaArrival(itemId, {
                  arrival_date: arrival.date,
                  quantity: quantityNum,
                });
              } else if (arrival.id && arrival.date && isValidQuantity) {
                // 기존 한국도착일 업데이트
                await updateKoreaArrival(arrival.id, {
                  arrival_date: arrival.date,
                  quantity: quantityNum,
                });
              }
            }

            // 삭제된 한국도착일 제거
            for (const serverArrival of currentKoreaArrivals) {
              const existsInClient = koreaArrivalDates.some(arr => arr.id === serverArrival.id);
              if (!existsInClient) {
                await deleteKoreaArrival(serverArrival.id);
              }
            }
          }
        }
      }

      // 데이터 다시 로드하여 DB에 저장된 최신 값 반영
      await loadPackingLists();
      
      alert('변경사항이 저장되었습니다.');
    } catch (error: any) {
      console.error('패킹리스트 저장 오류:', error);
      alert(error.message || '변경사항 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, packingListItems, originalPackingListItems, isGroupChanged, loadPackingLists]);



  return (
    <div className="p-8 overflow-x-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md">
              <PackageSearch className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">패킹리스트</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedKeys.size > 0 && (
              <>
                <button
                  onClick={() => {
                    const firstKey = Array.from(selectedKeys)[0];
                    // code-date 키에서 code와 date 추출 (첫 번째 하이픈 기준으로 분리)
                    const firstDashIndex = firstKey.indexOf('-');
                    if (firstDashIndex === -1) {
                      alert('유효하지 않은 선택입니다.');
                      return;
                    }
                    const code = firstKey.substring(0, firstDashIndex);
                    const date = firstKey.substring(firstDashIndex + 1);
                    
                    const itemsToEdit = packingListItems.filter(item => item.code === code && item.date === date && item.isFirstRow);
                    
                    // 같은 그룹의 모든 아이템 가져오기
                    const groupItems = packingListItems.filter(item => {
                      const groupId = getGroupId(item.id);
                      const firstItem = itemsToEdit[0];
                      if (!firstItem) return false;
                      return getGroupId(firstItem.id) === groupId;
                    });
                    
                    if (groupItems.length === 0) {
                      alert('수정할 항목을 찾을 수 없습니다.');
                      return;
                    }

                    const formData = convertItemToFormData(groupItems);
                    if (!formData) {
                      alert('데이터 변환에 실패했습니다.');
                      return;
                    }

                    setEditingCodeDate(firstKey);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  수정하기
                </button>
                <button
                  onClick={handleDeletePackingLists}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </>
            )}
            {!isD0Level && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                패킹 리스트 생성
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDirty && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">발송된 상품의 패킹 정보를 확인할 수 있습니다</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 items-center flex-1">
          <SearchBar
            value={inputSearchTerm}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="패킹리스트 코드, 물류회사, 제품명으로 검색..."
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
          >
            검색
          </button>
          
          {/* 월별 필터 */}
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
            <label className="text-sm text-gray-600 whitespace-nowrap">기간:</label>
            {showAllMonths ? (
              <button
                onClick={() => setShowAllMonths(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 보기
              </button>
            ) : (
              <>
                <select
                  value={selectedYearMonth}
                  onChange={(e) => {
                    setSelectedYearMonth(e.target.value);
                    setShowAllMonths(false);
                  }}
                  className="border-0 focus:outline-none focus:ring-0 text-sm font-medium cursor-pointer min-w-[130px]"
                >
                  {(() => {
                    const options: Array<{ value: string; label: string }> = [];
                    
                    // 최근 5년간의 모든 월 생성 (최신순)
                    for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
                      const year = currentYear - yearOffset;
                      const maxMonth = year === currentYear ? currentMonth : 12;
                      
                      for (let month = maxMonth; month >= 1; month--) {
                        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
                        const displayText = `${year}년${month}월`;
                        options.push({ value: yearMonth, label: displayText });
                      }
                    }
                    
                    return options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ));
                  })()}
                </select>
                <button
                  onClick={() => setShowAllMonths(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 ml-2 whitespace-nowrap"
                >
                  전체 보기
                </button>
              </>
            )}
          </div>
        </div>
        {!isD0Level && (
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  activeFilterCount > 0
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>
                    
              {/* Filter Dropdown Panel */}
              {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-900 text-sm font-semibold">필터 옵션</h3>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-purple-600 hover:text-purple-700"
                        >
                          전체 초기화
                        </button>
                      )}
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Groups */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 물류회사 필터 */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <h4 className="text-xs text-blue-900 mb-2 pb-1.5 border-b border-blue-300 font-semibold">물류회사</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {filterOptions.logisticsCompanies.length === 0 ? (
                          <p className="text-xs text-gray-500">등록된 물류회사가 없습니다</p>
                        ) : (
                          filterOptions.logisticsCompanies.map(company => (
                            <label key={company} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.logisticsCompanies.includes(company)}
                                onChange={() => toggleFilter('logisticsCompanies', company)}
                                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-xs text-gray-700">{company}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 상태 필터 */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <h4 className="text-xs text-green-900 mb-2 pb-1.5 border-b border-green-300 font-semibold">상태</h4>
                      <div className="space-y-1.5">
                        {['내륙운송중', '배송중', '한국도착'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-green-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.status.includes(status)}
                              onChange={() => toggleFilter('status', status)}
                              className="w-3.5 h-3.5 accent-green-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 날짜 범위 필터 */}
                  <div className="mt-4 bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h4 className="text-xs text-purple-900 mb-2 pb-1.5 border-b border-purple-300 font-semibold">발송일 범위</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">시작일</label>
                        <input
                          type="date"
                          value={filters.dateRange.startDate}
                          onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">종료일</label>
                        <input
                          type="date"
                          value={filters.dateRange.endDate}
                          onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
            
          </div>
        )}
        <span className="text-red-600 text-sm whitespace-nowrap">
              (Shift + 마우스 스크롤로 좌우 이동이 가능합니다)
            </span>
      </div>
            
      {/* 패킹 리스트 생성 모달 */}
      <PackingListCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePackingList}
        initialData={(location.state as { initialPackingListData?: PackingListFormData } | null)?.initialPackingListData}
        mode="create"
      />

      {/* 패킹 리스트 수정 모달 */}
      {editingCodeDate && (() => {
        // code-date 키에서 code와 date 추출 (첫 번째 하이픈 기준으로 분리)
        const firstDashIndex = editingCodeDate.indexOf('-');
        if (firstDashIndex === -1) return null;
        const code = editingCodeDate.substring(0, firstDashIndex);
        const date = editingCodeDate.substring(firstDashIndex + 1);
        
        const firstItem = packingListItems.find(item => item.code === code && item.date === date && item.isFirstRow);
        if (!firstItem) return null;
        
        const groupId = getGroupId(firstItem.id);
        const itemsToEdit = packingListItems.filter(item => getGroupId(item.id) === groupId);
        
        const formData = convertItemToFormData(itemsToEdit);
        return (
          <PackingListCreateModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingCodeDate(null);
            }}
            onSubmit={handleUpdatePackingList}
            initialData={formData || undefined}
            mode="edit"
          />
        );
      })()}

      {/* 이미지 모달 */}
      <GalleryImageModal
        imageUrl={selectedInvoiceImage}
        onClose={() => setSelectedInvoiceImage(null)}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 패킹 리스트 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <>
          {filteredPackingListItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {searchTerm.trim() || activeFilterCount > 0
                  ? '검색 결과가 없습니다.'
                  : '패킹리스트가 없습니다.'}
              </p>
            </div>
          ) : (
            <PackingListTable
              items={filteredPackingListItems}
              isSuperAdmin={isSuperAdmin}
              isAllSelected={isAllSelected}
              onToggleAll={toggleAllCodes}
              onToggleCode={toggleCode}
              isCodeSelected={isCodeSelected}
              onItemUpdate={handleItemUpdate}
              onDomesticInvoiceChange={handleDomesticInvoiceChange}
              onKoreaArrivalChange={handleKoreaArrivalChange}
              onProductNameClick={handleProductNameClick}
              onImageClick={setSelectedInvoiceImage}
              showCodeLink={showCodeLink}
              onCodeClick={handleCodeClick}
              hideSensitiveColumns={hideSensitiveColumns}
            />
          )}
        </>
      )}
    </div>
  );
}