import { useState, useEffect, useMemo } from 'react';
import { getAllPackingLists, type PackingListWithItems } from '../../api/packingListApi';
import { InboundTable } from './InboundTable';
import { SearchBar } from '../ui/search-bar';

export interface InboundItem {
  id: string; // packing_list_item_id + korea_arrival_id 조합
  arrivalDate: string; // 입고날짜 (한국도착일)
  productImage: string; // 상품사진
  productName: string; // 상품명
  purchaseOrderId: string | null; // 발주코드
  logisticsCompany: string; // 입고물류사
  smallPackCount: number; // OPP 소포장 수량
  setCount: number; // 한 세트 수
  boxCount: number; // 박스 마대별 세트수
  orderedQuantity: number; // 발주 수량
  unshippedQuantity: number; // 미발송수량
  inboundQuantity: number; // 입고 수량 (기존 출고 수량)
  remainingStock: number; // 잔여 재고 수량
  productId?: string; // 상품 ID
}

// 그룹화된 입고 데이터 구조
export interface InboundGroup {
  groupKey: string; // purchase_order_id + product_name 조합
  purchaseOrderId: string | null;
  productName: string;
  productImage: string;
  smallPackCount: number;
  setCount: number;
  boxCount: number;
  orderedQuantity: number;
  remainingStock: number;
  productId?: string;
  arrivals: InboundItem[]; // 해당 그룹의 입고 기록 배열
}

interface Product {
  id: string;
  name: string;
  small_pack_count: number;
  set_count: number;
  box_count: number;
  main_image: string | null;
  stock: number;
}

export function InboundTab() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  const [packingLists, setPackingLists] = useState<PackingListWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputSearchTerm, setInputSearchTerm] = useState('');

  // 패킹리스트 및 상품 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 패킹리스트와 상품 데이터 병렬 로드
        const [packingListsData, productsResponse] = await Promise.all([
          getAllPackingLists(),
          fetch(`${API_BASE_URL}/products`, {
            credentials: 'include',
          }),
        ]);

        setPackingLists(packingListsData);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          if (productsData.success) {
            setProducts(productsData.data || []);
          }
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [API_BASE_URL]);

  // 상품명으로 상품 정보 찾기
  const findProductByName = (productName: string): Product | null => {
    return products.find((p) => p.name === productName) || null;
  };

  // 이미지 URL 변환
  const getFullImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return `${SERVER_BASE_URL}${imageUrl}`;
  };

  // 입고 데이터 변환 및 그룹화
  const inboundGroups = useMemo(() => {
    const items: InboundItem[] = [];

    // 먼저 모든 입고 기록을 평탄화
    packingLists.forEach((packingList) => {
      packingList.items?.forEach((item) => {
        if (item.korea_arrivals && item.korea_arrivals.length > 0) {
          // 상품 정보 찾기 (상품명으로 매칭)
          const product = findProductByName(item.product_name);

          item.korea_arrivals.forEach((arrival) => {
            items.push({
              id: `${item.id}-${arrival.id}`,
              arrivalDate: arrival.arrival_date,
              productImage: product?.main_image 
                ? getFullImageUrl(product.main_image)
                : (item.product_image_url ? getFullImageUrl(item.product_image_url) : ''),
              productName: item.product_name,
              purchaseOrderId: item.purchase_order_id,
              logisticsCompany: packingList.logistics_company || '',
              smallPackCount: product?.small_pack_count || 1,
              setCount: product?.set_count || 1,
              boxCount: product?.box_count || 1,
              orderedQuantity: item.total_quantity || 0, // 발주 수량 (TODO: 실제 발주 수량으로 변경 필요)
              unshippedQuantity: 0, // 미발송수량 (TODO: 실제 미발송수량 계산 필요)
              inboundQuantity: arrival.quantity, // 입고 수량 (한국도착 수량)
              remainingStock: product?.stock || 0,
              productId: product?.id,
            });
          });
        }
      });
    });

    // 발주코드 + 상품명 기준으로 그룹화
    const groupMap = new Map<string, InboundGroup>();
    
    items.forEach((item) => {
      // 그룹 키: purchase_order_id + product_name
      const groupKey = `${item.purchaseOrderId || 'null'}-${item.productName}`;
      
      if (!groupMap.has(groupKey)) {
        // 새로운 그룹 생성
        groupMap.set(groupKey, {
          groupKey,
          purchaseOrderId: item.purchaseOrderId,
          productName: item.productName,
          productImage: item.productImage,
          smallPackCount: item.smallPackCount,
          setCount: item.setCount,
          boxCount: item.boxCount,
          orderedQuantity: item.orderedQuantity,
          remainingStock: item.remainingStock,
          productId: item.productId,
          arrivals: [],
        });
      }
      
      // 해당 그룹의 입고 기록 배열에 추가
      const group = groupMap.get(groupKey)!;
      group.arrivals.push(item);
    });

    // 각 그룹 내에서 입고 날짜 기준으로 정렬 (오름차순) 및 잔여 재고 수량 계산
    groupMap.forEach((group) => {
      group.arrivals.sort((a, b) => 
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
      );
      // 잔여 재고 수량 = 그룹 내 모든 입고수량의 합산
      group.remainingStock = group.arrivals.reduce((sum, arrival) => sum + arrival.inboundQuantity, 0);
    });

    // 그룹들을 배열로 변환하고 정렬 (최신 입고 날짜 기준 내림차순)
    return Array.from(groupMap.values()).sort((a, b) => {
      const aLatestDate = a.arrivals.length > 0 
        ? new Date(a.arrivals[a.arrivals.length - 1].arrivalDate).getTime()
        : 0;
      const bLatestDate = b.arrivals.length > 0
        ? new Date(b.arrivals[b.arrivals.length - 1].arrivalDate).getTime()
        : 0;
      return bLatestDate - aLatestDate;
    });
  }, [packingLists, products, SERVER_BASE_URL, findProductByName, getFullImageUrl]);

  // 검색 필터링
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return inboundGroups;
    }

    const searchLower = searchTerm.toLowerCase();
    return inboundGroups.filter((group) =>
      group.productName.toLowerCase().includes(searchLower) ||
      (group.purchaseOrderId && group.purchaseOrderId.toLowerCase().includes(searchLower)) ||
      group.arrivals.some(arrival => 
        arrival.logisticsCompany.toLowerCase().includes(searchLower)
      )
    );
  }, [inboundGroups, searchTerm]);

  // 검색 실행
  const handleSearch = () => {
    setSearchTerm(inputSearchTerm.trim());
  };

  // 엔터키 입력 핸들러
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 바 */}
      <div className="flex gap-2">
        <SearchBar
          value={inputSearchTerm}
          onChange={setInputSearchTerm}
          onKeyDown={handleSearchKeyDown}
          placeholder="상품명 또는 입고물류사로 검색..."
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
        >
          검색
        </button>
      </div>

      {/* 입고 목록 테이블 */}
      <InboundTable groups={filteredGroups} />
    </div>
  );
}

