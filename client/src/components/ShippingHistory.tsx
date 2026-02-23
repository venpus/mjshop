import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePackingListUnsaved } from '../contexts/PackingListUnsavedContext';
import { PackageSearch, Plus, Edit, Trash2, Save, Filter, X, FileText, ShoppingCart } from 'lucide-react';
import { SearchBar } from './ui/search-bar';
import { PackingListCreateModal, type PackingListFormData } from './PackingListCreateModal';
import { useAuth } from '../contexts/AuthContext';
import { GalleryImageModal } from './GalleryImageModal';
import { PackingListDetailModal } from './PackingListDetailModal';
import { PurchaseOrderDetailModal } from './payment/PurchaseOrderDetailModal';
import { PackingListTable } from './packing-list/PackingListTable';
import { ExportButton } from './packing-list/ExportButton';
import { usePackingListSelection } from '../hooks/usePackingListSelection';
import { convertItemToFormData, getGroupId } from '../utils/packingListUtils';
import type { PackingListItem } from './packing-list/types';
import { LOGISTICS_COMPANIES } from './packing-list/types';
import {
  getPackingListsPaginated,
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
import { TablePagination } from './ui/table-pagination';
import { transformServerToClient, transformFormDataProductsToItems, transformFormDataToServerRequest, getPackingListIdFromCode } from '../utils/packingListTransform';
type TabType = 'packing-list-input' | 'purchase-order-packing-list';

export function ShippingHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setHasUnsavedChanges } = usePackingListUnsaved();
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPackingListId, setSelectedPackingListId] = useState<number | null>(null);
  const [packingListItems, setPackingListItems] = useState<PackingListItem[]>([]);
  const [originalPackingListItems, setOriginalPackingListItems] = useState<PackingListItem[]>([]); // 원본 데이터 (변경 감지용)
  const [selectedInvoiceImage, setSelectedInvoiceImage] = useState<string | null>(null);
  const [selectedPurchaseOrderIdForModal, setSelectedPurchaseOrderIdForModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false); // 변경사항이 있는지 여부
  const [isSaving, setIsSaving] = useState(false); // 저장 중인지 여부
  const [lastEditedGroupId, setLastEditedGroupId] = useState<string | null>(null); // 저장 바를 표시할 그룹 (수정한 행 아래)
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('packing-list-input');
  
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  
  // 검색/필터 상태
  const [inputSearchTerm, setInputSearchTerm] = useState(''); // 입력 필드에 표시되는 검색어
  const [searchTerm, setSearchTerm] = useState(''); // 실제 검색에 사용되는 검색어
  const [purchaseOrderIdFromUrl, setPurchaseOrderIdFromUrl] = useState<string | null>(null); // 발주 필터 (URL에서 진입 시)
  const [poNumberFromUrl, setPoNumberFromUrl] = useState<string | null>(null); // 발주 번호 (배너 표시용)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    logisticsCompanies: [] as string[],
    dateRange: {
      startDate: '',
      endDate: ''
    },
    status: [] as string[], // 내륙운송중, 배송중, 한국도착
  });
  
  // URL 쿼리에서 발주 필터 적용 (발주 관리 목록에서 돋보기로 진입 시)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const poId = params.get('purchaseOrderId');
    const poNum = params.get('poNumber');
    if (poId?.trim()) {
      setPurchaseOrderIdFromUrl(poId.trim());
      setPoNumberFromUrl(poNum ? decodeURIComponent(poNum) : null);
      setInputSearchTerm(poNum ? decodeURIComponent(poNum) : '');
      setSearchTerm('');
    } else {
      setPurchaseOrderIdFromUrl(null);
      setPoNumberFromUrl(null);
    }
  }, [location.search]);

  // location state에서 initialPackingListData / initialPackingListCode 확인 (공장→물류창고·패킹리스트 코드에서 전달)
  useEffect(() => {
    const state = location.state as {
      initialPackingListData?: PackingListFormData;
      initialPackingListCode?: string;
    } | null;
    if (state?.initialPackingListData) {
      setIsCreateModalOpen(true);
      setSelectedPurchaseOrderIdForModal(null); // 발주 상세 모달 닫기 (리스크 대응)
      window.history.replaceState({}, document.title);
    }
    if (state?.initialPackingListCode) {
      setSelectedPurchaseOrderIdForModal(null); // 발주 상세 모달 닫기 (리스크 대응)
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

  // 데이터 로드 (페이징 + 서버 필터)
  const loadPackingLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      const filtersParam = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        logisticsCompanies: isD0Level
          ? ['광저우-비전', '위해-비전']
          : (filters.logisticsCompanies.length > 0 ? filters.logisticsCompanies : undefined),
        startDate: filters.dateRange.startDate || undefined,
        endDate: filters.dateRange.endDate || undefined,
        status: filters.status.length > 0 ? filters.status : undefined,
        purchaseOrderId: purchaseOrderIdFromUrl || undefined,
      };

      const [result, purchaseOrdersResponse] = await Promise.all([
        getPackingListsPaginated(filtersParam),
        fetch(`${API_BASE_URL}/purchase-orders`, {
          credentials: 'include',
        }),
      ]);

      let purchaseOrders: Array<{ id: string; product_main_image: string | null; po_number?: string }> = [];
      if (purchaseOrdersResponse.ok) {
        const purchaseOrdersData = await purchaseOrdersResponse.json();
        if (purchaseOrdersData.success) {
          purchaseOrders = (purchaseOrdersData.data || []).map((po: any) => ({
            id: po.id,
            product_main_image: po.product_main_image || null,
            po_number: po.po_number || undefined,
          }));
        }
      }

      const transformedItems = transformServerToClient(result.data, purchaseOrders);
      setPackingListItems(transformedItems);
      setOriginalPackingListItems(JSON.parse(JSON.stringify(transformedItems)));
      setTotalItems(result.pagination.total);
      setIsDirty(false);
    } catch (err: any) {
      console.error('[ShippingHistory] 패킹리스트 로드 오류:', err);
      setError(err.message || '패킹리스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, filters, isD0Level, purchaseOrderIdFromUrl]);

  useEffect(() => {
    loadPackingLists();
  }, [loadPackingLists]);

  // 페이지/페이지당 개수 변경 시 선택 초기화
  useEffect(() => {
    clearSelection();
  }, [currentPage, itemsPerPage]);

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
    setCurrentPage(1);
  };

  // 입력 필드 변경 핸들러 (실제 검색은 실행하지 않음). X 클릭 등으로 비우면 검색/발주 필터 해제하고 전체 리스트 표시
  const handleSearchInputChange = (value: string) => {
    setInputSearchTerm(value);
    if (value.trim() === '') {
      setSearchTerm('');
      setCurrentPage(1);
      if (purchaseOrderIdFromUrl) {
        setPurchaseOrderIdFromUrl(null);
        setPoNumberFromUrl(null);
        navigate(location.pathname, { replace: true });
      }
    }
  };

  // 발주 필터 해제 (배너 [필터 해제] 클릭 시)
  const handleClearPurchaseOrderFilter = useCallback(() => {
    setPurchaseOrderIdFromUrl(null);
    setPoNumberFromUrl(null);
    setInputSearchTerm('');
    setSearchTerm('');
    setCurrentPage(1);
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  // 엔터키 입력 핸들러
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 필터 토글 핸들러
  const toggleFilter = (category: 'logisticsCompanies' | 'status', value: string) => {
    setCurrentPage(1);
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
    setCurrentPage(1);
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
    setCurrentPage(1);
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

  // 탭별 표시 목록: 서버에서 이미 필터 적용됨. 발주별 탭만 발주번호 순 정렬
  const displayItems = useMemo(() => {
    if (activeTab === 'purchase-order-packing-list') {
      return [...packingListItems].sort((a, b) => {
        const poA = a.poNumber ?? '';
        const poB = b.poNumber ?? '';
        const cmpPo = poA.localeCompare(poB, undefined, { numeric: true });
        if (cmpPo !== 0) return cmpPo;
        const cmpCode = (a.code ?? '').localeCompare(b.code ?? '');
        if (cmpCode !== 0) return cmpCode;
        return (a.date ?? '').localeCompare(b.date ?? '');
      });
    }
    return packingListItems;
  }, [activeTab, packingListItems]);

  // 체크박스로 선택한 행 중 첫 번째 그룹 ID (수정/삭제 바를 해당 행 아래에 표시하기 위함)
  const firstSelectedGroupId = useMemo(() => {
    if (selectedKeys.size === 0) return null;
    const firstKey = Array.from(selectedKeys)[0];
    const parts = firstKey.split('::');
    if (parts.length !== 2) return null;
    const [code, date] = parts;
    const firstItem = displayItems.find(item => item.code === code && item.date === date && item.isFirstRow);
    return firstItem ? getGroupId(firstItem.id) : null;
  }, [selectedKeys, displayItems]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // 체크박스 선택 후 수정 모달 열기 (행 아래 수정 바에서 호출)
  const handleOpenEditModal = useCallback(() => {
    if (selectedKeys.size === 0) return;
    const firstKey = Array.from(selectedKeys)[0];
    const parts = firstKey.split('::');
    if (parts.length !== 2) {
      alert('유효하지 않은 선택입니다.');
      return;
    }
    const code = parts[0];
    const date = parts[1];
    const itemsToEdit = packingListItems.filter(item => item.code === code && item.date === date && item.isFirstRow);
    const groupItems = packingListItems.filter(item => {
      const firstItem = itemsToEdit[0];
      if (!firstItem) return false;
      return getGroupId(item.id) === getGroupId(firstItem.id);
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
  }, [selectedKeys, packingListItems]);

  // 코드 클릭 시 패킹리스트 상세 모달 열기
  const handleCodeClick = (code: string, date: string) => {
    // code와 date로 패킹리스트 ID 찾기
    const codeDateKey = `${code}::${date}`;
    const packingListId = getPackingListIdFromCode(packingListItems, codeDateKey);
    
    if (!packingListId) {
      alert('패킹리스트를 찾을 수 없습니다.');
      return;
    }
    
    // 변경사항이 있으면 확인
    if (isDirty) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말로 상세 화면을 열으시겠습니까?\n\n변경사항은 저장되지 않습니다.'
      );
      if (!confirmed) {
        return;
      }
    }
    
    // 모달 열기
    setSelectedPackingListId(packingListId);
    setIsDetailModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPackingListId(null);
  };

  const handleProductNameClick = (purchaseOrderId?: string) => {
    if (purchaseOrderId) {
      setSelectedPurchaseOrderIdForModal(purchaseOrderId);
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

  // 앱 내 이동 시 확인용: 상위 레이아웃에서 사용. isDirty와 동기화, 언마운트 시 해제
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
    return () => setHasUnsavedChanges(false);
  }, [isDirty, setHasUnsavedChanges]);

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
    setLastEditedGroupId(groupId);
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
    setPackingListItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item) setLastEditedGroupId(getGroupId(item.id));
      return prev.map(item => {
        if (item.id === itemId) {
          return { ...item, koreaArrivalDate: koreaArrivalDates };
        }
        return item;
      });
    });
  }, []);

  // 아이템 업데이트 헬퍼 함수 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleItemUpdate = useCallback((groupId: string, updater: (item: PackingListItem) => PackingListItem) => {
    setLastEditedGroupId(groupId);
    setPackingListItems(prev => {
      const updated = prev.map(item => {
        const itemGroupId = getGroupId(item.id);
        if (itemGroupId === groupId) {
          return updater(item);
        }
        return item;
      });
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

  // 변경사항 폐기 (취소)
  const handleDiscardChanges = useCallback(() => {
    if (!isDirty) return;
    if (!confirm('변경사항을 모두 취소하시겠습니까? 저장하지 않은 수정 내용이 사라집니다.')) {
      return;
    }
    setPackingListItems(JSON.parse(JSON.stringify(originalPackingListItems)));
    setIsDirty(false);
  }, [isDirty, originalPackingListItems]);

  return (
    <>
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

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('packing-list-input')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'packing-list-input'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            건별 패킹리스트 입력
          </button>
          <button
            onClick={() => setActiveTab('purchase-order-packing-list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'purchase-order-packing-list'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            발주별 패킹리스트
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 (건별 / 발주별 동일 UI, 발주별은 발주번호 순 정렬) */}
      {(activeTab === 'packing-list-input' || activeTab === 'purchase-order-packing-list') && (
        <>
          {/* 발주 필터 배너 (URL로 진입 시) */}
          {purchaseOrderIdFromUrl && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
              <span className="text-sm font-medium text-purple-800">
                발주 {poNumberFromUrl || purchaseOrderIdFromUrl} 관련 패킹리스트
              </span>
              <button
                type="button"
                onClick={handleClearPurchaseOrderFilter}
                className="rounded px-3 py-1 text-sm text-purple-600 hover:bg-purple-100 transition-colors"
              >
                필터 해제
              </button>
            </div>
          )}
          {/* 검색 및 필터 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <SearchBar
            value={inputSearchTerm}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="패킹리스트 코드, 물류회사, 제품명으로 검색..."
            className="max-w-3xl"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
          >
            검색
          </button>
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
              <div className="absolute top-full right-0 mt-2 w-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
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
        // code::date 키에서 code와 date 추출
        const parts = editingCodeDate.split('::');
        if (parts.length !== 2) return null;
        const code = parts[0];
        const date = parts[1];
        
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

          {/* 패킹리스트 상세 모달 */}
          <PackingListDetailModal
        isOpen={isDetailModalOpen}
        packingListId={selectedPackingListId}
        onClose={handleCloseDetailModal}
      />

          {/* 발주 상세 모달 (제품명/제품사진 클릭 시) */}
          {selectedPurchaseOrderIdForModal && (
        <PurchaseOrderDetailModal
          orderId={selectedPurchaseOrderIdForModal}
          isOpen={true}
          onClose={() => setSelectedPurchaseOrderIdForModal(null)}
          returnPath="/admin/shipping-history"
        />
      )}

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
          {displayItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              {purchaseOrderIdFromUrl ? (
                <>
                  <p className="text-gray-700 font-medium">해당 발주에 연결된 패킹리스트가 없습니다.</p>
                  <p className="mt-2 text-sm text-gray-500">발주 상세 &gt; 배송 탭에서 패킹리스트를 생성할 수 있습니다.</p>
                </>
              ) : (
                <p className="text-gray-500">
                  {searchTerm.trim() || activeFilterCount > 0
                    ? '검색 결과가 없습니다.'
                    : '패킹리스트가 없습니다.'}
                </p>
              )}
            </div>
          ) : (
            <>
              {(displayItems.length > 0 || totalItems > 0) && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={Math.min(endIndex, totalItems)}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  className="border-b-0 rounded-b-none"
                />
              )}
              <PackingListTable
                items={displayItems}
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
                isC0Level={isC0Level}
                isD0Level={isD0Level}
                lastEditedGroupId={lastEditedGroupId}
                firstSelectedGroupId={firstSelectedGroupId}
                saveBarContent={isDirty ? (
                  <div className="flex items-center justify-center gap-4 py-3 bg-amber-50 border-y border-amber-200">
                    <span className="text-gray-700 font-medium">저장하지 않은 변경사항이 있습니다</span>
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        !isSaving ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                ) : null}
                editBarContent={selectedKeys.size > 0 ? (
                  <div className="flex items-center justify-center gap-3 py-3 bg-blue-50 border-y border-blue-200">
                    <button
                      type="button"
                      onClick={handleOpenEditModal}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      수정하기
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePackingLists}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                    {isSuperAdmin && (
                      <ExportButton selectedKeys={selectedKeys} packingListItems={packingListItems} />
                    )}
                  </div>
                ) : null}
              />
              {(displayItems.length > 0 || totalItems > 0) && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={Math.min(endIndex, totalItems)}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
          )}
          </>
          )}
        </>
      )}
    </div>
    </>
  );
}