import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filter, Download, Eye, Package, Plus, Image, X, CheckSquare, RotateCw, Trash2 } from 'lucide-react';
import { TablePagination } from './ui/table-pagination';
import { StatusBadge } from './ui/status-badge';
import { SearchBar } from './ui/search-bar';
import { ReorderPurchaseOrderModal } from './ReorderPurchaseOrderModal';
import { useReorderPurchaseOrder } from '../hooks/useReorderPurchaseOrder';
import { PurchaseOrderDeleteDialog } from './PurchaseOrderDeleteDialog';
import { useAuth } from '../contexts/AuthContext';
import { useDeletePurchaseOrder } from '../hooks/useDeletePurchaseOrder';
import { formatDateForInput, formatDateKST } from '../utils/dateUtils';
import { CreatePurchaseOrderButton } from './purchase-order/CreatePurchaseOrderButton';
import { 
  calculateBasicCostTotal,
  calculateCommissionAmount,
  calculateShippingCostTotal, 
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
  calculateDeliveryStatus,
  calculateFactoryStatusFromQuantity,
  calculateWorkStatus,
  calculatePackingListShippingCost
} from '../utils/purchaseOrderCalculations';
import { getShippingCostByPurchaseOrder } from '../api/packingListApi';

interface PurchaseOrdersProps {
  onViewDetail: (orderId: string, tab?: 'cost' | 'factory' | 'work' | 'delivery', autoSave?: boolean) => void;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier?: {
    id: number;
    name: string;
    url: string | null;
  };
  product?: {
    id: string | null;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
    category?: string;
    size?: string | null;
    weight?: string | null;
  };
  unitPrice: number;
  backMargin: number; // 추가 단가
  optionCost: number;
  laborCost: number; // 인건비 총액
  quantity: number;
  amount: number;
  size: string;
  weight: string;
  packaging: number;
  commissionRate: number; // 수수료율
  shippingCost: number; // 배송비
  warehouseShippingCost: number; // 창고 배송비
  factoryStatus: '출고대기' | '배송중' | '수령완료'; // 출고상태 (현재 주석 처리됨 - 추후 사용 예정)
  workStatus: '작업대기' | '작업중' | '완료';
  deliveryStatus: '대기중' | '내륙운송중' | '배송중' | '한국도착';
  paymentStatus: '미결제' | '선금결제' | '완료';
  orderStatus: '발주확인' | '발주 대기' | '취소됨';
  date: string;
  isOrderConfirmed?: boolean;
  // 선금/잔금 정보
  advancePaymentAmount?: number | null; // 선금 금액
  advancePaymentDate?: string | null; // 선금 지급일
  balancePaymentAmount?: number | null; // 잔금 금액
  balancePaymentDate?: string | null; // 잔금 지급일
  // 수량 정보
  unshippedQuantity?: number; // 미발송 수량 (업체 출고 수량 - 패킹리스트 출고 수량)
  shippingQuantity?: number; // 배송중 수량 (패킹리스트 출고 수량 - 한국도착 수량)
  unreceivedQuantity?: number; // 미입고 수량 (발주 수량 - 업체 출고 수량)
  koreaArrivedQuantity?: number; // 한국도착 수량
  packingListShippingCost?: number; // 패킹리스트 배송비
  estimatedDelivery?: string; // 예정 납기일
  warehouseArrivalDate?: string | null; // 물류창고 도착일
  hasKoreaArrival?: number | boolean; // 한국도착일 존재 여부
}

export function PurchaseOrders({ onViewDetail }: PurchaseOrdersProps) {
  console.log('[PurchaseOrders] 컴포넌트 렌더링 시작');
  const { user } = useAuth();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('[PurchaseOrders] 현재 경로:', location.pathname);
  console.log('[PurchaseOrders] user:', user);
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [totalItems, setTotalItems] = useState(0); // 전체 발주 개수 (서버에서 받음)
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log('[PurchaseOrders] useEffect 실행 - 컴포넌트 마운트 또는 경로 변경');
    console.log('[PurchaseOrders] location.pathname:', location.pathname);
  }, [location.pathname]);
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  
  // URL 쿼리 파라미터에서 페이지 번호 및 검색어 읽기
  const searchParams = new URLSearchParams(location.search);
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPageFromUrl = parseInt(searchParams.get('itemsPerPage') || '15', 10);
  const searchFromUrl = searchParams.get('search') || '';
  
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageFromUrl);
  const [searchTerm, setSearchTerm] = useState(searchFromUrl); // 실제 검색에 사용되는 검색어
  const [inputSearchTerm, setInputSearchTerm] = useState(searchFromUrl); // 입력 필드에 표시되는 검색어
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    // factoryStatus: [] as string[], // 출고상태 필터 (주석 처리 - 추후 사용 예정)
    // workStatus: [] as string[], // 작업상태 필터 (제거됨)
    deliveryStatus: [] as string[],
    paymentStatus: [] as string[],
    orderStatus: [] as string[],
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  // 이미지 URL을 전체 URL로 변환하는 헬퍼 함수 (캐시 버스팅 포함)
  const getFullImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';
    
    let fullUrl: string;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      fullUrl = imageUrl;
    } else {
      fullUrl = `${SERVER_BASE_URL}${imageUrl}`;
    }
    
    // 캐시 버스팅: 이미 쿼리 파라미터가 있으면 추가하지 않음
    if (!fullUrl.includes('?')) {
      const cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 일 단위
      return `${fullUrl}?v=${cacheBuster}`;
    }
    
    return fullUrl;
  };

  // 발주 목록 로드
  const loadPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      
      // 필터가 활성화되어 있는지 확인
      const hasActiveFilters = 
        filters.deliveryStatus.length > 0 || 
        filters.paymentStatus.length > 0 || 
        filters.orderStatus.length > 0;
      
      // 페이징 및 검색 파라미터 추가
      const params = new URLSearchParams();
      // 필터가 활성화되어 있으면 전체 데이터를 가져오기 위해 limit을 설정하지 않음 (또는 매우 큰 값)
      if (!hasActiveFilters) {
        params.set('page', currentPage.toString());
        params.set('limit', itemsPerPage.toString());
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      const response = await fetch(`${API_BASE_URL}/purchase-orders?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // 페이징 정보 저장
        if (data.pagination) {
          setTotalItems(data.pagination.total);
        }
        
        // 서버 응답을 클라이언트 PurchaseOrder 인터페이스로 변환
        const convertedOrders: PurchaseOrder[] = data.data.map((po: any) => {
          return {
            id: po.id,
            poNumber: po.po_number,
            supplier: po.supplier,
            product: po.product,
            unitPrice: po.unit_price || 0,
            backMargin: po.back_margin || 0,
            optionCost: po.total_option_cost || 0, // 서버에서 계산된 옵션 비용 총액
            laborCost: po.total_labor_cost || 0, // 서버에서 계산된 인건비 총액
            quantity: po.quantity || 0,
            amount: 0, // 최종 결제 금액은 별도로 계산
            commissionRate: po.commission_rate || 0,
            shippingCost: po.shipping_cost || 0,
            warehouseShippingCost: po.warehouse_shipping_cost || 0,
            size: po.product?.size || po.size || '',
            weight: po.product?.weight || po.weight || '',
            packaging: po.packaging || 0,
            // 업체 출고 상태 계산: factory_shipped_quantity와 ordered_quantity를 기반으로 계산 (주석 처리 - 추후 사용 예정)
            // factoryStatus: calculateFactoryStatusFromQuantity(
            //   po.factory_shipped_quantity !== undefined ? Number(po.factory_shipped_quantity) : 0,
            //   po.quantity || 0
            // ),
            factoryStatus: '출고대기' as const, // 임시 값 (주석 처리된 코드를 복원하면 제거)
            // 작업 상태 계산: work_start_date와 work_end_date를 기반으로 계산
            workStatus: calculateWorkStatus(
              po.work_start_date ? formatDateForInput(po.work_start_date) : null,
              po.work_end_date ? formatDateForInput(po.work_end_date) : null
            ),
            // 배송 상태 계산: 패킹리스트 정보를 기반으로 계산
            // 상세페이지와 동일한 로직 적용
            deliveryStatus: calculateDeliveryStatus(
              (po.shipped_quantity !== undefined && Number(po.shipped_quantity) > 0), // hasPackingList
              po.warehouse_arrival_date || null, // warehouseArrivalDate
              (po.has_korea_arrival !== undefined && (Number(po.has_korea_arrival) > 0 || po.has_korea_arrival === true)), // hasKoreaArrival
              po.delivery_status || '대기중' // defaultDeliveryStatus
            ),
            // 결제 상태 정규화: 유효한 값만 허용하고, 그 외는 '미결제'로 변환
            paymentStatus: (() => {
              const status = po.payment_status;
              if (!status || typeof status !== 'string') return '미결제';
              const normalizedStatus = status.trim();
              if (['미결제', '선금결제', '완료'].includes(normalizedStatus)) {
                return normalizedStatus;
              }
              return '미결제';
            })(),
            // order_status가 있으면 사용, 없으면 is_confirmed 기반으로 계산 (기존 데이터 호환성)
            orderStatus: po.order_status || (po.is_confirmed ? '발주확인' : '발주 대기'),
            date: formatDateForInput(po.order_date),
            isOrderConfirmed: po.is_confirmed || false,
            // 선금/잔금 정보
            advancePaymentAmount: po.advance_payment_amount || null,
            advancePaymentDate: po.advance_payment_date ? formatDateForInput(po.advance_payment_date) : null,
            balancePaymentAmount: po.balance_payment_amount || null,
            balancePaymentDate: po.balance_payment_date ? formatDateForInput(po.balance_payment_date) : null,
            // 패킹리스트와 연동된 수량 정보
            unshippedQuantity: po.unshipped_quantity !== undefined ? Number(po.unshipped_quantity) : undefined,
            shippingQuantity: po.shipping_quantity !== undefined ? Number(po.shipping_quantity) : undefined,
            unreceivedQuantity: po.unreceived_quantity !== undefined ? Number(po.unreceived_quantity) : undefined,
            koreaArrivedQuantity: po.arrived_quantity !== undefined ? Number(po.arrived_quantity) : undefined,
            // 예정 납기일
            estimatedDelivery: po.estimated_delivery ? formatDateForInput(po.estimated_delivery) : undefined,
            // 패킹리스트 정보
            warehouseArrivalDate: po.warehouse_arrival_date ? formatDateForInput(po.warehouse_arrival_date) : null,
            hasKoreaArrival: po.has_korea_arrival !== undefined ? (Number(po.has_korea_arrival) > 0 || po.has_korea_arrival === true) : false,
          };
        });
        
        // 각 발주에 대해 패킹리스트 배송비 가져오기
        const ordersWithShippingCost = await Promise.all(convertedOrders.map(async (order) => {
          try {
            const shippingCostData = await getShippingCostByPurchaseOrder(order.id);
            if (shippingCostData) {
              // 발주 수량 × 단위당 배송비로 총 배송비 계산
              const packingListShippingCost = calculatePackingListShippingCost(
                shippingCostData.unit_shipping_cost,
                shippingCostData.ordered_quantity
              );
              return { ...order, packingListShippingCost };
            }
            return { ...order, packingListShippingCost: 0 };
          } catch (error) {
            console.error(`패킹리스트 배송비 조회 오류 (발주 ID: ${order.id}):`, error);
            return { ...order, packingListShippingCost: 0 };
          }
        }));
        
        setPurchaseOrders(ordersWithShippingCost);
      }
    } catch (err: any) {
      console.error('발주 로드 오류:', err);
      alert(err.message || '발주 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 재주문 훅 사용 (loadPurchaseOrders 선언 후에 위치)
  const {
    reorderOrder,
    openReorder,
    closeReorder,
    handleConfirmReorder,
  } = useReorderPurchaseOrder({
    onSuccess: (newOrderId) => {
      // 목록 새로고침
      loadPurchaseOrders();
      // 새로 생성된 발주의 상세 페이지로 이동 (자동 저장 옵션 포함, 현재 페이지 정보 및 검색어 포함)
      const params = new URLSearchParams();
      params.set('tab', 'work');
      params.set('autoSave', 'true');
      params.set('returnPage', currentPage.toString());
      params.set('returnItemsPerPage', itemsPerPage.toString());
      if (searchTerm.trim()) {
        params.set('returnSearch', searchTerm.trim());
      }
      navigate(`/admin/purchase-orders/${newOrderId}?${params.toString()}`);
    },
  });

  // 삭제 훅 사용 (A 레벨 관리자만 사용)
  const {
    deleteOrder,
    openDelete,
    closeDelete,
    handleConfirmDelete,
  } = useDeletePurchaseOrder({
    onSuccess: loadPurchaseOrders,
  });

  // 상태 필터만 클라이언트 측에서 적용 (검색은 서버 사이드에서 처리)
  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    // const matchesFactoryStatus = filters.factoryStatus.length === 0 || filters.factoryStatus.includes(po.factoryStatus); // 출고상태 필터 (주석 처리 - 추후 사용 예정)
    // const matchesWorkStatus = filters.workStatus.length === 0 || filters.workStatus.includes(po.workStatus); // 작업상태 필터 (제거됨)
    const matchesDeliveryStatus = filters.deliveryStatus.length === 0 || filters.deliveryStatus.includes(po.deliveryStatus);
    
    // 결제 상태 필터링: 필터가 비어있으면 모든 항목 표시, 아니면 선택된 필터와 일치하는 항목만 표시
    // paymentStatus는 항상 '미결제', '선금결제', '완료' 중 하나로 정규화되어 있음
    const matchesPaymentStatus = filters.paymentStatus.length === 0 || filters.paymentStatus.includes(po.paymentStatus);
    
    
    const matchesOrderStatus = filters.orderStatus.length === 0 || filters.orderStatus.includes(po.orderStatus);
    
    return /* matchesFactoryStatus && */ /* matchesWorkStatus && */ matchesDeliveryStatus && matchesPaymentStatus && matchesOrderStatus;
  });

  const statusOptions = ['전체', '출고대기', '배송중', '수령완료', '작업대기', '작업중', '완료', '공장출고', '중국운송중', '항공운송중', '해운운송중', '통관및 배달', '한국도착'];

  // Pagination calculations
  // 검색은 서버 사이드에서 처리되므로, 검색어가 있을 때는 서버에서 받은 결과를 그대로 사용
  // 상태 필터만 클라이언트 측에서 적용
  const hasActiveStatusFilters = 
    // filters.factoryStatus.length > 0 || // 출고상태 필터 (주석 처리 - 추후 사용 예정)
    // filters.workStatus.length > 0 || // 작업상태 필터 (제거됨)
    filters.deliveryStatus.length > 0 || 
    filters.paymentStatus.length > 0 || 
    filters.orderStatus.length > 0;
  
  const filteredCount = filteredPurchaseOrders.length;
  
  // 상태 필터가 있을 때: 클라이언트에서 필터링된 결과를 페이징
  // 상태 필터가 없을 때: 서버에서 페이징된 결과를 그대로 사용
  const totalPages = hasActiveStatusFilters 
    ? Math.ceil(filteredCount / itemsPerPage)
    : Math.ceil(totalItems / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // 상태 필터가 있을 때만 slice, 없을 때는 서버에서 받은 데이터를 그대로 사용
  const currentPurchaseOrders = hasActiveStatusFilters 
    ? filteredPurchaseOrders.slice(startIndex, endIndex)
    : purchaseOrders; // 서버에서 이미 페이징되어 있으므로 그대로 사용
  
  // 표시할 전체 개수: 상태 필터가 있으면 필터링된 개수, 없으면 서버의 전체 개수
  const displayTotalItems = hasActiveStatusFilters ? filteredCount : totalItems;

  // 검색 실행 핸들러 (엔터키 또는 검색 버튼 클릭 시)
  const handleSearch = () => {
    const trimmedSearch = inputSearchTerm.trim();
    setSearchTerm(trimmedSearch);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    
    // URL 쿼리 파라미터 업데이트
    const params = new URLSearchParams(location.search);
    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // 검색 시 페이지를 1로 리셋
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    
    // 검색어가 변경되면 서버에서 데이터를 다시 로드 (useEffect에서 자동 처리됨)
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // URL 쿼리 파라미터 업데이트
    const params = new URLSearchParams(location.search);
    params.set('page', page.toString());
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
    // URL 쿼리 파라미터 업데이트
    const params = new URLSearchParams(location.search);
    params.set('itemsPerPage', value.toString());
    params.set('page', '1');
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // URL 쿼리 파라미터 변경 시 상태 동기화
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
    const itemsPerPageFromUrl = parseInt(searchParams.get('itemsPerPage') || '15', 10);
    const searchFromUrl = searchParams.get('search') || '';
    
    // URL 값으로 상태 업데이트
    setCurrentPage(pageFromUrl);
    setItemsPerPage(itemsPerPageFromUrl);
    setSearchTerm(searchFromUrl);
    setInputSearchTerm(searchFromUrl); // 입력 필드도 동기화
  }, [location.search]);

  useEffect(() => {
    loadPurchaseOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchTerm, filters]); // 페이지, itemsPerPage, 검색어, 필터 변경 시 다시 로드

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  
  // 체크박스 토글
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };
  
  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedOrders.size === filteredPurchaseOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredPurchaseOrders.map(po => po.id)));
    }
  };
  
  // 발주 취소 핸들러
  const handleCancelOrder = async (order: PurchaseOrder) => {
    // 이미 취소된 발주는 처리하지 않음
    if (order.orderStatus === '취소됨') {
      return;
    }

    if (!confirm(`발주번호 ${order.poNumber}를 취소하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          order_status: '취소됨',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 취소에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '발주 취소에 실패했습니다.');
      }

      // 성공 메시지 표시
      alert('발주가 성공적으로 취소되었습니다.');

      // 목록 새로고침
      await loadPurchaseOrders();
    } catch (err: any) {
      alert(err.message || '발주 취소 중 오류가 발생했습니다.');
      console.error('발주 취소 오류:', err);
    }
  };

  // 발주 컨펌 처리 (DB에 저장)
  const handleConfirmOrders = async () => {
    if (selectedOrders.size === 0) return;

    const selectedOrderIds = Array.from(selectedOrders);
    
    try {
      // 선택된 모든 발주에 대해 is_confirmed를 true로 업데이트
      const updatePromises = selectedOrderIds.map(orderId =>
        fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            is_confirmed: true,
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      
      // 모든 응답 확인
      const errors: string[] = [];
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const errorData = await responses[i].json().catch(() => ({}));
          errors.push(`${selectedOrderIds[i]}: ${errorData.error || '업데이트 실패'}`);
        } else {
          const data = await responses[i].json();
          if (!data.success) {
            errors.push(`${selectedOrderIds[i]}: ${data.error || '업데이트 실패'}`);
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(`일부 발주 컨펌에 실패했습니다:\n${errors.join('\n')}`);
      }

      // 성공 메시지
      alert(`${selectedOrderIds.length}개의 발주가 성공적으로 컨펌되었습니다.`);

      // 목록 새로고침하여 최신 상태 반영
      await loadPurchaseOrders();
      
      // 선택 초기화
      setSelectedOrders(new Set());
    } catch (err: any) {
      console.error('발주 컨펌 오류:', err);
      alert(err.message || '발주 컨펌 중 오류가 발생했습니다.');
    }
  };

  // 필터 토글 함수
  const toggleFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      // 필터 변경 시 첫 페이지로 리셋
      setCurrentPage(1);
      return { ...prev, [category]: newValues };
    });
  };

  // 모든 필터 초기화
  const clearAllFilters = () => {
    setFilters({
      // factoryStatus: [], // 출고상태 필터 (주석 처리 - 추후 사용 예정)
      // workStatus: [], // 작업상태 필터 (제거됨)
      deliveryStatus: [],
      paymentStatus: [],
      orderStatus: [],
    });
  };

  // 활성 필터 개수
  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  if (isLoading) {
    return (
      <div className="p-8 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">발주 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-gray-900 mb-2">발주 관리</h2>
          <p className="text-gray-600">중국 제조사에 발주한 상품을 확인하고 제조 상태를 관리할 수 있습니다</p>
        </div>
        <CreatePurchaseOrderButton />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <SearchBar
            value={inputSearchTerm}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="발주번호, 공급업체명, 상품명으로 검색..."
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
          >
            검색
          </button>
        </div>
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
              <div className="absolute top-full left-0 mt-2 w-[850px] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-900 text-sm">필터 옵션</h3>
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

                  {/* Filter Groups - Grid Layout */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* 발주 상태 */}
                    <div className="bg-indigo-50 rounded-lg p-2.5 border border-indigo-200">
                      <h4 className="text-xs text-indigo-900 mb-2 pb-1.5 border-b border-indigo-300">발주 상태</h4>
                      <div className="space-y-1.5">
                        {['발주 대기', '발주확인', '취소됨'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.orderStatus.includes(status)}
                              onChange={() => toggleFilter('orderStatus', status)}
                              className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 업체출고 상태 필터 (주석 처리 - 추후 사용 예정) */}
                    {/* <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                      <h4 className="text-xs text-blue-900 mb-2 pb-1.5 border-b border-blue-300">업체출고 상태</h4>
                      <div className="space-y-1.5">
                        {['출고대기', '배송중', '수령완료'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.factoryStatus.includes(status)}
                              onChange={() => toggleFilter('factoryStatus', status)}
                              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div> */}

                    {/* 작업 상태 필터 (제거됨) */}

                    {/* 배송 상태 */}
                    <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200">
                      <h4 className="text-xs text-purple-900 mb-2 pb-1.5 border-b border-purple-300">배송 상태</h4>
                      <div className="space-y-1.5">
                        {['대기중', '내륙운송중', '배송중', '한국도착'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-purple-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.deliveryStatus.includes(status)}
                              onChange={() => toggleFilter('deliveryStatus', status)}
                              className="w-3.5 h-3.5 accent-purple-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 결제 상태 */}
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                      <h4 className="text-xs text-amber-900 mb-2 pb-1.5 border-b border-amber-300">결제 상태</h4>
                      <div className="space-y-1.5">
                        {['미결제', '선금결제', '완료'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.paymentStatus.includes(status)}
                              onChange={() => toggleFilter('paymentStatus', status)}
                              className="w-3.5 h-3.5 accent-amber-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleConfirmOrders}
            disabled={selectedOrders.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedOrders.size > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>발주 컨펌{selectedOrders.size > 0 ? ` (${selectedOrders.size})` : ''}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            <span>내보내기</span>
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 상단 페이징 */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={displayTotalItems}
          startIndex={hasActiveStatusFilters ? startIndex + 1 : 1}
          endIndex={hasActiveStatusFilters ? Math.min(endIndex, filteredCount) : Math.min(purchaseOrders.length, itemsPerPage)}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          className="border-t-0 border-b border-gray-200"
        />
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredPurchaseOrders.length && filteredPurchaseOrders.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 cursor-pointer accent-purple-600"
                  />
                </th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">발주정보</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">상품정보</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">발주 상태</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">단가</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">수량</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">발주금액</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap bg-yellow-100">예상최종단가</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">사이즈</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">무게</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">소포장 방식</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">미입고 수량</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">미발송 수량</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">배송중 수량</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">한국도착 수량</th>
                {/* 출고상태 열 (주석 처리 - 추후 사용 예정) */}
                {/* <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">출고상태</th> */}
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">결제</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPurchaseOrders.map((po) => {
                // 발주 단가 = 기본 단가 + 추가 단가
                const orderUnitPrice = po.unitPrice + po.backMargin;
                
                // 수수료 계산 (2025-01-06 이후 발주는 옵션비용과 인건비 포함)
                const commissionAmount = calculateCommissionAmount(
                  po.unitPrice,
                  po.quantity,
                  po.commissionRate,
                  po.backMargin,
                  po.date,
                  po.optionCost,
                  po.laborCost
                );
                
                // 최종 결제 금액 계산
                const basicCostTotal = calculateBasicCostTotal(
                  po.unitPrice,
                  po.quantity,
                  po.commissionRate,
                  po.backMargin,
                  po.date
                );
                const shippingCostTotal = calculateShippingCostTotal(
                  po.shippingCost,
                  po.warehouseShippingCost
                );
                const finalPaymentAmount = calculateFinalPaymentAmount(
                  basicCostTotal,
                  shippingCostTotal,
                  po.optionCost,
                  po.laborCost,
                  commissionAmount,
                  po.date
                );
                
                // 예상최종단가 = (최종 결제 금액 + 패킹리스트 배송비) / 수량
                const finalUnitPrice = calculateExpectedFinalUnitPrice(
                  finalPaymentAmount,
                  po.packingListShippingCost || 0,
                  po.quantity
                );
                
                return (
                  <tr key={po.id} className={`hover:bg-gray-50 ${po.isOrderConfirmed ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(po.id)}
                        onChange={() => toggleOrderSelection(po.id)}
                        className="w-4 h-4 cursor-pointer accent-purple-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td 
                      className="px-4 py-2 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        // 현재 페이지 정보 및 검색어를 URL 쿼리 파라미터로 전달하기 위해 직접 navigate
                        const params = new URLSearchParams();
                        params.set('returnPage', currentPage.toString());
                        params.set('returnItemsPerPage', itemsPerPage.toString());
                        if (searchTerm.trim()) {
                          params.set('returnSearch', searchTerm.trim());
                        }
                        navigate(`/admin/purchase-orders/${po.id}?${params.toString()}`);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-900">{po.date}</span>
                        <span className="text-gray-500 text-xs">{po.poNumber}</span>
                      </div>
                    </td>
                    <td 
                      className="px-4 py-2 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                      onClick={() => {
                        // 현재 페이지 정보 및 검색어를 URL 쿼리 파라미터로 전달하기 위해 직접 navigate
                        const params = new URLSearchParams();
                        params.set('returnPage', currentPage.toString());
                        params.set('returnItemsPerPage', itemsPerPage.toString());
                        if (searchTerm.trim()) {
                          params.set('returnSearch', searchTerm.trim());
                        }
                        navigate(`/admin/purchase-orders/${po.id}?${params.toString()}`);
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          {po.product?.main_image ? (
                            <img
                              src={getFullImageUrl(po.product.main_image)}
                              alt={po.product.name}
                              className="w-full h-full object-cover"
                              onMouseMove={handleMouseMove}
                              onMouseEnter={() => setHoveredProduct(getFullImageUrl(po.product.main_image))}
                              onMouseLeave={() => setHoveredProduct(null)}
                            />
                          ) : (
                            <Image className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-600 text-center font-bold">{po.product?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge 
                        status={po.orderStatus} 
                        type="order" 
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-gray-900">¥{orderUnitPrice.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.quantity}개</td>
                    <td className="px-4 py-2 text-center text-gray-900">¥{finalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-center text-gray-900 bg-yellow-100">
                      <div className="flex flex-col gap-0.5">
                        <span>¥{finalUnitPrice.toFixed(2)}</span>
                        {/* 패킹리스트 출고 수량이 0이면 표시 */}
                        {((po.shippingQuantity || 0) + (po.koreaArrivedQuantity || 0)) === 0 ? (
                          <span className="text-xs text-red-500">(계산 미완성, 출고대기)</span>
                        ) : (
                          /* 패킹리스트 출고가 있지만 배송비가 없으면 표시 */
                          (po.packingListShippingCost === undefined || po.packingListShippingCost === 0) && (
                            <span className="text-xs text-red-500">(계산 미완성, 배송비 입력 전)</span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.size ? `${po.size}cm` : '-'}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.weight ? `${po.weight}g` : '-'}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.packaging.toLocaleString()}개</td>
                    <td className="px-4 py-2 text-center text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span>{po.unreceivedQuantity !== undefined ? `${po.unreceivedQuantity}개` : '-'}</span>
                        {po.estimatedDelivery && (
                          <span className="text-xs text-gray-500">납기: {po.estimatedDelivery}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">
                      {po.unshippedQuantity !== undefined ? `${po.unshippedQuantity}개` : '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">
                      {po.shippingQuantity !== undefined ? `${po.shippingQuantity}개` : '-'}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">
                      {po.koreaArrivedQuantity !== undefined ? `${po.koreaArrivedQuantity}개` : '-'}
                    </td>
                    {/* 출고상태 열 (주석 처리 - 추후 사용 예정) */}
                    {/* <td className="px-4 py-2 text-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">업체출고:</span>
                          <StatusBadge 
                            status={po.factoryStatus} 
                            type="factory" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const params = new URLSearchParams();
                              params.set('tab', 'factory');
                              params.set('returnPage', currentPage.toString());
                              params.set('returnItemsPerPage', itemsPerPage.toString());
                              navigate(`/admin/purchase-orders/${po.id}?${params.toString()}`);
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">작업:</span>
                          <StatusBadge 
                            status={po.workStatus} 
                            type="work" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              const params = new URLSearchParams();
                              params.set('tab', 'work');
                              params.set('returnPage', currentPage.toString());
                              params.set('returnItemsPerPage', itemsPerPage.toString());
                              navigate(`/admin/purchase-orders/${po.id}?${params.toString()}`);
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">배송:</span>
                          <StatusBadge 
                            status={po.deliveryStatus} 
                            type="delivery" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(po.id, 'delivery');
                            }}
                          />
                        </div>
                      </div>
                    </td> */}
                    <td className="px-4 py-2 text-center">
                      {(() => {
                        // 선금/잔금 금액이 있는지 확인
                        const hasAdvance = po.advancePaymentAmount && po.advancePaymentAmount > 0;
                        const hasBalance = po.balancePaymentAmount && po.balancePaymentAmount > 0;
                        
                        // 둘 다 없으면 기존 paymentStatus 표시 (하위 호환성)
                        if (!hasAdvance && !hasBalance) {
                          return <StatusBadge status={po.paymentStatus} type="payment" size="sm" />;
                        }
                        
                        // 선금/잔금 각각 표시 (결제내역과 동일한 방식)
                        return (
                          <div className="flex flex-col gap-1 items-center">
                            {hasAdvance && (
                              <StatusBadge 
                                status={po.advancePaymentDate ? `지급완료 (${formatDateKST(po.advancePaymentDate)})` : '지급대기'} 
                                type="payment" 
                                size="xs" 
                              />
                            )}
                            {hasBalance && (
                              <StatusBadge 
                                status={po.balancePaymentDate ? `지급완료 (${formatDateKST(po.balancePaymentDate)})` : '지급대기'} 
                                type="payment" 
                                size="xs" 
                              />
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openReorder(po);
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="재주문"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(po);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrder(po);
                          }}
                          disabled={po.orderStatus === '취소됨'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            po.orderStatus === '취소됨'
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={po.orderStatus === '취소됨' ? '이미 취소된 발주' : '취소'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={displayTotalItems}
          startIndex={hasActiveStatusFilters ? startIndex + 1 : 1}
          endIndex={hasActiveStatusFilters ? Math.min(endIndex, filteredCount) : Math.min(purchaseOrders.length, itemsPerPage)}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Product Image Preview */}
      {hoveredProduct && (
        <div
          className="fixed w-64 h-64 bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden flex items-center justify-center pointer-events-none z-50"
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y + 20}px`,
          }}
        >
          <img
            src={hoveredProduct}
            alt="Product Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Reorder Modal */}
      {reorderOrder && (
        <ReorderPurchaseOrderModal
          purchaseOrder={reorderOrder}
          onConfirm={handleConfirmReorder}
          onCancel={closeReorder}
        />
      )}

      {/* Delete Dialog */}
      {deleteOrder && (
        <PurchaseOrderDeleteDialog
          purchaseOrder={deleteOrder}
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}