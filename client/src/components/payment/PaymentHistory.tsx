import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Package, List } from 'lucide-react';
import { PaymentRequestList } from './PaymentRequestList';
import { PaymentHistoryTable } from './PaymentHistoryTable';
import { PaymentStatisticsCards } from './PaymentStatisticsCards';
import { useAuth } from '../../contexts/AuthContext';

// type TabType = 'all' | 'purchase-orders' | 'packing-lists' | 'requests';
type TabType = 'purchase-orders' | 'packing-lists' | 'requests';

/**
 * 결제내역 메인 컴포넌트
 */
export function PaymentHistory() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL 쿼리 파라미터에서 탭 정보 읽기
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const validTabs: TabType[] = ['purchase-orders', 'packing-lists', 'requests'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'purchase-orders';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [statisticsRefreshTrigger, setStatisticsRefreshTrigger] = useState(0);

  // 초기 마운트 시 URL에서 탭 정보 읽기
  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabType | null;
    if (currentTab && validTabs.includes(currentTab)) {
      setActiveTab(currentTab);
    } else if (!currentTab) {
      // URL에 탭 정보가 없으면 기본 탭을 URL에 추가
      const params = new URLSearchParams(location.search);
      params.set('tab', 'purchase-orders');
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 초기 마운트 시에만 실행

  // URL에 탭 정보 업데이트
  const updateUrlTab = (tab: TabType) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    updateUrlTab(tab);
  };

  // A레벨 관리자만 접근 가능
  if (user?.level !== 'A-SuperAdmin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleStatisticsRefresh = () => {
    setStatisticsRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">결제내역</h2>
        <p className="text-gray-600">발주관리와 패킹리스트의 결제 내역을 확인하고 지급요청을 관리할 수 있습니다</p>
      </div>

      {/* 통계 카드 */}
      <PaymentStatisticsCards refreshTrigger={statisticsRefreshTrigger} />

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {/* 전체보기 탭 - 제거됨 */}
          {/* <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            전체 보기
          </button> */}
          <button
            onClick={() => handleTabChange('purchase-orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'purchase-orders'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            발주관리
          </button>
          <button
            onClick={() => handleTabChange('packing-lists')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'packing-lists'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            패킹리스트
          </button>
          <button
            onClick={() => handleTabChange('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            지급요청
          </button>
        </nav>
      </div>

      {/* 컨텐츠 */}
      <div>
        {activeTab === 'requests' ? (
          <PaymentRequestList onRefresh={handleStatisticsRefresh} />
        ) : (
          <PaymentHistoryTable
            // type={activeTab === 'all' ? 'all' : activeTab === 'purchase-orders' ? 'purchase-orders' : 'packing-lists'}
            type={activeTab === 'purchase-orders' ? 'purchase-orders' : 'packing-lists'}
            onStatisticsRefresh={handleStatisticsRefresh}
          />
        )}
      </div>
    </div>
  );
}

