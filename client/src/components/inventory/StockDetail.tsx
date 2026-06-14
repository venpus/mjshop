import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailHeader } from '../DetailHeader';
import { StockDetailHeader } from './StockDetailHeader';
import { StockDetailTabNavigation } from './StockDetailTabNavigation';
import { InboundHistoryTab } from './InboundHistoryTab';
import { OutboundSalesTab } from './OutboundSalesTab';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import { getStockInboundByGroupKey } from '../../api/stockInboundApi';
import {
  getOutboundRecordsByGroupKey,
  createOutboundRecord,
  updateOutboundRecord,
  deleteOutboundRecord,
  type StockOutboundRecord,
  type CreateStockOutboundRecordData,
  type UpdateStockOutboundRecordData,
} from '../../api/stockOutboundApi';

export function StockDetail() {
  const { groupKey: encodedGroupKey } = useParams<{ groupKey: string }>();
  const navigate = useNavigate();

  const [inboundItem, setInboundItem] = useState<Awaited<ReturnType<typeof getStockInboundByGroupKey>>>(null);
  const [outboundRecords, setOutboundRecords] = useState<StockOutboundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');

  const groupKey = encodedGroupKey ? decodeURIComponent(encodedGroupKey) : '';

  useEffect(() => {
    const loadData = async () => {
      if (!groupKey) return;

      try {
        setIsLoading(true);
        const [inbound, outboundRecordsData] = await Promise.all([
          getStockInboundByGroupKey(groupKey),
          getOutboundRecordsByGroupKey(groupKey).catch(() => []),
        ]);
        setInboundItem(inbound);
        setOutboundRecords(outboundRecordsData);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [groupKey]);

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

  if (!inboundItem) {
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

  const productImage = getFullImageUrl(inboundItem.productMainImage);

  return (
    <div className="p-6 min-h-[1080px]">
      <DetailHeader onBack={handleBack} title="재고 상세" />

      <div className="mb-6">
        <StockDetailHeader
          productName={inboundItem.productName}
          productImage={productImage}
          orderedQuantity={inboundItem.inboundQuantity}
          unshippedQuantity={0}
          inboundQuantity={inboundItem.inboundQuantity}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <StockDetailTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'inbound' && (
          <div className="py-8">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">발주번호</dt>
                <dd className="font-medium text-gray-900">{inboundItem.poNumber || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">단가</dt>
                <dd className="font-medium text-gray-900">
                  {inboundItem.unitPrice != null ? `¥${inboundItem.unitPrice.toFixed(2)}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">판매가</dt>
                <dd className="font-medium text-gray-900">
                  {inboundItem.sellingPrice != null
                    ? `₩${inboundItem.sellingPrice.toLocaleString()}`
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">재고 수량</dt>
                <dd className="font-medium text-blue-700">
                  {inboundItem.stockQuantity.toLocaleString()}개
                </dd>
              </div>
            </dl>
          </div>
        )}
        {activeTab === 'outbound' && (
          <OutboundSalesTab
            groupKey={inboundItem.groupKey}
            inboundQuantity={inboundItem.inboundQuantity}
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
