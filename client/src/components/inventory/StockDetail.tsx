import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailHeader } from '../DetailHeader';
import { StockDetailHeader } from './StockDetailHeader';
import { StockDetailTabNavigation } from './StockDetailTabNavigation';
import { InboundHistoryTab } from './InboundHistoryTab';
import { OutboundSalesTab } from './OutboundSalesTab';
import { getAllPackingLists, type PackingListWithItems } from '../../api/packingListApi';
import {
  getOutboundRecordsByGroupKey,
  createOutboundRecord,
  updateOutboundRecord,
  deleteOutboundRecord,
  type StockOutboundRecord,
  type CreateStockOutboundRecordData,
  type UpdateStockOutboundRecordData,
} from '../../api/stockOutboundApi';
import type { InboundGroup, InboundItem } from './InboundTab';

interface Product {
  id: string;
  name: string;
  main_image: string | null;
}

export function StockDetail() {
  const { groupKey: encodedGroupKey } = useParams<{ groupKey: string }>();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  const [packingLists, setPackingLists] = useState<PackingListWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [outboundRecords, setOutboundRecords] = useState<StockOutboundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');

  // groupKey 디코딩
  const groupKey = encodedGroupKey ? decodeURIComponent(encodedGroupKey) : '';

  // 이미지 URL 변환 (캐시 버스팅 포함)
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

  // 상품명으로 상품 정보 찾기
  const findProductByName = (productName: string): Product | null => {
    return products.find((p) => p.name === productName) || null;
  };

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [packingListsData, productsResponse, outboundRecordsData] = await Promise.all([
          getAllPackingLists(),
          fetch(`${API_BASE_URL}/products`, {
            credentials: 'include',
          }),
          groupKey ? getOutboundRecordsByGroupKey(groupKey).catch(() => []) : Promise.resolve([]),
        ]);

        setPackingLists(packingListsData);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          if (productsData.success) {
            setProducts(productsData.data || []);
          }
        }

        setOutboundRecords(outboundRecordsData);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (groupKey) {
      loadData();
    }
  }, [API_BASE_URL, groupKey]);

  // groupKey에서 데이터 추출 및 그룹화
  const stockGroup = useMemo(() => {
    if (!groupKey || !packingLists.length) return null;

    // groupKey 형식: "purchaseOrderId-productName" (첫 번째 하이픈이 구분자)
    const firstDashIndex = groupKey.indexOf('-');
    const purchaseOrderId = firstDashIndex !== -1 ? groupKey.substring(0, firstDashIndex) : groupKey;
    const productName = firstDashIndex !== -1 ? groupKey.substring(firstDashIndex + 1) : '';
    const normalizedPurchaseOrderId = purchaseOrderId === 'null' ? null : purchaseOrderId;

    const items: InboundItem[] = [];

    packingLists.forEach((packingList) => {
      packingList.items?.forEach((item) => {
        if (
          item.product_name === productName &&
          (normalizedPurchaseOrderId === null || item.purchase_order_id === normalizedPurchaseOrderId) &&
          item.korea_arrivals &&
          item.korea_arrivals.length > 0
        ) {
          const product = findProductByName(item.product_name);

          item.korea_arrivals.forEach((arrival) => {
            items.push({
              id: `${item.id}-${arrival.id}`,
              arrivalDate: arrival.arrival_date,
              productImage: product?.main_image
                ? getFullImageUrl(product.main_image)
                : item.product_image_url
                  ? getFullImageUrl(item.product_image_url)
                  : '',
              productName: item.product_name,
              purchaseOrderId: item.purchase_order_id,
              logisticsCompany: packingList.logistics_company || '',
              smallPackCount: product?.small_pack_count || 1,
              setCount: product?.set_count || 1,
              boxCount: product?.box_count || 1,
              orderedQuantity: item.total_quantity || 0,
              unshippedQuantity: 0,
              inboundQuantity: arrival.quantity,
              remainingStock: product?.stock || 0,
              productId: product?.id,
            });
          });
        }
      });
    });

    if (items.length === 0) return null;

    // 입고 기록 정렬
    items.sort(
      (a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    );

    const inboundQuantity = items.reduce((sum, item) => sum + item.inboundQuantity, 0);
    const orderedQuantity = items[0]?.orderedQuantity || 0;
    const unshippedQuantity = Math.max(0, orderedQuantity - inboundQuantity);
    const remainingStock = items.reduce((sum, item) => sum + item.inboundQuantity, 0);

    return {
      groupKey,
      purchaseOrderId: normalizedPurchaseOrderId,
      productName,
      productImage: items[0]?.productImage || '',
      smallPackCount: items[0]?.smallPackCount || 1,
      setCount: items[0]?.setCount || 1,
      boxCount: items[0]?.boxCount || 1,
      orderedQuantity,
      remainingStock,
      productId: items[0]?.productId,
      arrivals: items,
      inboundQuantity,
      unshippedQuantity,
    };
  }, [groupKey, packingLists, products, SERVER_BASE_URL, findProductByName, getFullImageUrl]);

  const handleBack = () => {
    navigate('/admin/inventory');
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!stockGroup) {
    return (
      <div className="p-6 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">재고 정보를 찾을 수 없습니다.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[1080px]">
      <DetailHeader onBack={handleBack} title="재고 상세" />

      {/* 헤더 섹션 */}
      <div className="mb-6">
        <StockDetailHeader
          productName={stockGroup.productName}
          productImage={stockGroup.productImage}
          orderedQuantity={stockGroup.orderedQuantity}
          unshippedQuantity={stockGroup.unshippedQuantity}
          inboundQuantity={stockGroup.inboundQuantity}
        />
      </div>

      {/* 탭 네비게이션 및 컨텐츠 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <StockDetailTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* 탭 컨텐츠 */}
        {activeTab === 'inbound' && <InboundHistoryTab arrivals={stockGroup.arrivals} />}
        {activeTab === 'outbound' && (
          <OutboundSalesTab
            groupKey={stockGroup.groupKey}
            inboundQuantity={stockGroup.inboundQuantity}
            outboundRecords={outboundRecords}
            onAdd={async (data: CreateStockOutboundRecordData) => {
              const newRecord = await createOutboundRecord(data);
              setOutboundRecords([...outboundRecords, newRecord]);
            }}
            onUpdate={async (id: number, data: UpdateStockOutboundRecordData) => {
              const updatedRecord = await updateOutboundRecord(id, data);
              setOutboundRecords(outboundRecords.map((r) => (r.id === id ? updatedRecord : r)));
            }}
            onDelete={async (id: number) => {
              await deleteOutboundRecord(id);
              setOutboundRecords(outboundRecords.filter((r) => r.id !== id));
            }}
          />
        )}
      </div>
    </div>
  );
}

