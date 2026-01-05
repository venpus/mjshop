import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, X, CheckCircle } from 'lucide-react';
import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';
import { PaymentHistoryDetail } from './PaymentHistoryDetail';
import { getFullImageUrl, updateAdminCostPaid } from '../../api/purchaseOrderApi';
import { deletePaymentRequest, completePaymentRequest, createPaymentRequest } from '../../api/paymentRequestApi';
import { PaymentHistoryItem } from '../../api/paymentHistoryApi';
import { formatDateKST, getLocalDateString } from '../../utils/dateUtils';
import { updatePackingList, getPackingListByCode, updatePackingListAdminCostPaid } from '../../api/packingListApi';

interface PaymentHistoryRowProps {
  item: PaymentHistoryItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRequestPayment: (
    sourceType: 'purchase_order' | 'packing_list',
    sourceId: string,
    paymentType: 'advance' | 'balance' | 'shipping',
    amount: number,
    sourceInfo?: any
  ) => void;
  isAdminLevelA: boolean;
  onRefresh?: () => void;
  onItemUpdate?: (itemId: string, updates: Partial<PaymentHistoryItem>) => void; // 특정 item만 업데이트
  onStatisticsRefresh?: () => void; // 통계 카드만 업데이트
  onViewOrderDetail?: (orderId: string) => void; // 발주 상세 보기 핸들러
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
}

/**
 * 결제내역 테이블 행 컴포넌트
 */
export function PaymentHistoryRow({
  item,
  isExpanded,
  onToggleExpand,
  onRequestPayment,
  isAdminLevelA,
  onRefresh,
  onItemUpdate,
  onStatisticsRefresh,
  onViewOrderDetail,
  userLevel,
}: PaymentHistoryRowProps) {
  const isLevelC = userLevel === 'C0: 한국Admin';
  // A레벨 관리자 비용 지불 완료 상태 (로컬 상태)
  const [adminCostPaid, setAdminCostPaid] = useState(item.admin_cost_paid || false);
  const [adminCostPaidDate, setAdminCostPaidDate] = useState(item.admin_cost_paid_date || null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 패킹리스트 지급요청 체크박스 상태
  const [isPaymentRequestChecked, setIsPaymentRequestChecked] = useState(!!item.payment_request);
  const [isUpdatingPaymentRequest, setIsUpdatingPaymentRequest] = useState(false);
  
  // 패킹리스트 지급 날짜 체크박스 상태
  const [isPaymentDateChecked, setIsPaymentDateChecked] = useState(!!item.wk_payment_date);
  const [paymentDate, setPaymentDate] = useState(item.wk_payment_date || null);
  const [isUpdatingPaymentDate, setIsUpdatingPaymentDate] = useState(false);

  // item이 변경될 때 상태 동기화
  useEffect(() => {
    setAdminCostPaid(item.admin_cost_paid || false);
    setAdminCostPaidDate(item.admin_cost_paid_date || null);
    setIsPaymentRequestChecked(!!item.payment_request);
    setIsPaymentDateChecked(!!item.wk_payment_date);
    setPaymentDate(item.wk_payment_date || null);
  }, [item.admin_cost_paid, item.admin_cost_paid_date, item.payment_request, item.wk_payment_date]);

  // A레벨 관리자 비용 지불 완료 체크박스 변경 핸들러 (발주관리용)
  const handleAdminCostPaidChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.source_type !== 'purchase_order' || !item.admin_total_cost) {
      return; // 발주관리 항목이고 A레벨 관리자 비용이 있는 경우에만 처리
    }

    const newValue = e.target.checked;
    const previousValue = adminCostPaid;

    // 낙관적 업데이트
    setAdminCostPaid(newValue);
    setIsUpdating(true);

    try {
      await updateAdminCostPaid(item.source_id, newValue);
      
      // 낙관적 업데이트: 날짜도 즉시 업데이트 (로컬 날짜 기준)
      if (newValue) {
        const today = getLocalDateString();
        setAdminCostPaidDate(today);
      } else {
        setAdminCostPaidDate(null);
      }
      
      // 성공 시 onRefresh 호출하여 목록 새로고침
      if (onRefresh) {
        // 약간의 지연을 두어 서버 데이터가 반영되도록 함
        setTimeout(() => {
          onRefresh();
        }, 300);
      }
    } catch (error: any) {
      console.error('A레벨 관리자 비용 지불 완료 상태 업데이트 오류:', error);
      // 실패 시 이전 값으로 롤백
      setAdminCostPaid(previousValue);
      alert(error.message || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // A레벨 관리자 비용 지불 완료 체크박스 변경 핸들러 (패킹리스트용)
  const handlePackingListAdminCostPaidChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.source_type !== 'packing_list' || !item.shipping_cost_difference) {
      return; // 패킹리스트 항목이고 배송비 차액이 있는 경우에만 처리
    }

    const newValue = e.target.checked;
    const previousValue = adminCostPaid;

    // 낙관적 업데이트
    setAdminCostPaid(newValue);
    setIsUpdating(true);

    try {
      // 패킹리스트 ID 가져오기
      let packingListId: number | null = null;
      
      if (item.packing_list_ids) {
        // packing_list_ids가 있으면 첫 번째 ID 사용
        const ids = item.packing_list_ids.split(',').map(id => id.trim());
        packingListId = parseInt(ids[0], 10);
      } else if (item.packing_code) {
        // packing_code가 있으면 코드로 조회
        const packingList = await getPackingListByCode(item.packing_code);
        if (packingList) {
          packingListId = packingList.id;
        }
      }

      if (!packingListId || isNaN(packingListId)) {
        throw new Error('패킹리스트 ID를 찾을 수 없습니다.');
      }

      await updatePackingListAdminCostPaid(packingListId, newValue);
      
      // 낙관적 업데이트: 날짜도 즉시 업데이트 (로컬 날짜 기준)
      if (newValue) {
        const today = getLocalDateString();
        setAdminCostPaidDate(today);
      } else {
        setAdminCostPaidDate(null);
      }
      
      // 성공 시 onRefresh 호출하여 목록 새로고침 및 통계 카드 업데이트
      if (onRefresh) {
        // 약간의 지연을 두어 서버 데이터가 반영되도록 함
        setTimeout(() => {
          onRefresh();
        }, 300);
      }
    } catch (error: any) {
      console.error('A레벨 관리자 비용 지불 완료 상태 업데이트 오류:', error);
      // 실패 시 이전 값으로 롤백
      setAdminCostPaid(previousValue);
      alert(error.message || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 상품 사진/상품명 클릭 핸들러
  const handleProductClick = (e: React.MouseEvent) => {
    // Ctrl+클릭 또는 Cmd+클릭: 새 탭에서 열기
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const url = `/admin/purchase-orders/${item.source_id}?returnPath=${encodeURIComponent('/admin/payment-history')}`;
      window.open(url, '_blank');
      return;
    }

    // 일반 클릭: 모달로 열기
    if (onViewOrderDetail && item.source_type === 'purchase_order') {
      onViewOrderDetail(item.source_id);
    }
  };

  // 우클릭 메뉴: 새 탭에서 열기
  const handleContextMenu = (e: React.MouseEvent) => {
    if (item.source_type === 'purchase_order') {
      e.preventDefault();
      const url = `/admin/purchase-orders/${item.source_id}?returnPath=${encodeURIComponent('/admin/payment-history')}`;
      window.open(url, '_blank');
    }
  };

  // 지급요청 취소 핸들러 (낙관적 업데이트 적용)
  const handleCancelRequest = async (
    requestId: number,
    paymentType: 'advance' | 'balance' | 'shipping'
  ) => {
    let paymentTypeLabel = '';
    if (paymentType === 'advance') {
      paymentTypeLabel = '선금';
    } else if (paymentType === 'balance') {
      paymentTypeLabel = '잔금';
    } else {
      paymentTypeLabel = '배송비';
    }

    if (!confirm(`${paymentTypeLabel} 요청을 취소하시겠습니까?`)) {
      return;
    }

    try {
      // 기존 요청 정보 저장 (롤백용)
      let previousRequest;
      if (paymentType === 'advance') {
        previousRequest = item.advance_payment_request;
      } else if (paymentType === 'balance') {
        previousRequest = item.balance_payment_request;
      } else {
        previousRequest = item.payment_request;
      }

      await deletePaymentRequest(requestId);

      // 부모 컴포넌트의 item 업데이트
      if (onItemUpdate) {
        if (paymentType === 'advance') {
          onItemUpdate(item.id, {
            advance_payment_request: undefined,
          });
        } else if (paymentType === 'balance') {
          onItemUpdate(item.id, {
            balance_payment_request: undefined,
          });
        } else {
          // shipping (패킹리스트)
          onItemUpdate(item.id, {
            payment_request: undefined,
          });
        }
      }

      // 통계 카드만 업데이트 (전체 리로드 없이)
      if (onStatisticsRefresh) {
        onStatisticsRefresh();
      }
    } catch (error: any) {
      alert(error.message || '지급요청 취소에 실패했습니다.');
      // 실패 시 롤백은 필요 없음 (삭제는 이미 완료되었거나 실패한 상태)
    }
  };

  // 패킹리스트 지급요청 체크박스 변경 핸들러 (낙관적 업데이트 적용)
  const handlePaymentRequestCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.source_type !== 'packing_list') return;
    
    const checked = e.target.checked;
    const previousChecked = isPaymentRequestChecked;
    const previousPaymentRequest = item.payment_request;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    setIsPaymentRequestChecked(checked);
    setIsUpdatingPaymentRequest(true);
    
    try {
      if (checked) {
        // 체크: 지급요청 생성
        // 패킹리스트 ID 목록 가져오기
        const packingListIds = item.packing_list_ids 
          ? item.packing_list_ids.split(',').map(id => id.trim()).filter(id => id)
          : [];
        
        // amount가 없거나 0이면 지급요청 생성 불가
        if (!item.pl_shipping_cost || item.pl_shipping_cost <= 0) {
          throw new Error('배송비가 없어 지급요청을 생성할 수 없습니다.');
        }
        
        let createdRequest;
        if (packingListIds.length === 0) {
          // ID가 없으면 코드로 조회
          const packingList = await getPackingListByCode(item.packing_code || item.source_id);
          if (!packingList) {
            throw new Error('패킹리스트를 찾을 수 없습니다.');
          }
          
          createdRequest = await createPaymentRequest({
            source_type: 'packing_list',
            source_id: String(packingList.id), // 패킹리스트 ID로 전달
            payment_type: 'shipping',
            amount: item.pl_shipping_cost,
          });
        } else {
          // 첫 번째 패킹리스트 ID 사용
          const firstPackingListId = packingListIds[0];
          if (!firstPackingListId) {
            throw new Error('패킹리스트 ID를 찾을 수 없습니다.');
          }
          
          createdRequest = await createPaymentRequest({
            source_type: 'packing_list',
            source_id: firstPackingListId, // 패킹리스트 ID로 전달
            payment_type: 'shipping',
            amount: item.pl_shipping_cost,
          });
        }
        
        // API 응답으로 부모 컴포넌트의 item 업데이트
        if (onItemUpdate) {
          onItemUpdate(item.id, {
            payment_request: {
              id: createdRequest.id,
              request_number: createdRequest.request_number,
              status: createdRequest.status,
            },
          });
        }
      } else {
        // 체크 해제: 지급요청 삭제
        if (item.payment_request) {
          await deletePaymentRequest(item.payment_request.id);
          
          // 부모 컴포넌트의 item 업데이트
          if (onItemUpdate) {
            onItemUpdate(item.id, {
              payment_request: undefined,
            });
          }
        }
      }
      
      // 통계 카드만 업데이트 (전체 리로드 없이)
      if (onStatisticsRefresh) {
        onStatisticsRefresh();
      }
    } catch (error: any) {
      // 실패 시 롤백
      alert(error.message || '지급요청 처리에 실패했습니다.');
      setIsPaymentRequestChecked(previousChecked);
      // 부모 컴포넌트도 롤백
      if (onItemUpdate && previousPaymentRequest) {
        onItemUpdate(item.id, {
          payment_request: previousPaymentRequest,
        });
      }
    } finally {
      setIsUpdatingPaymentRequest(false);
    }
  };

  // 패킹리스트 지급 날짜 체크박스 변경 핸들러 (낙관적 업데이트 적용)
  const handlePaymentDateCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.source_type !== 'packing_list') return;
    
    const checked = e.target.checked;
    const previousChecked = isPaymentDateChecked;
    const previousPaymentDate = item.wk_payment_date;
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    setIsPaymentDateChecked(checked);
    setIsUpdatingPaymentDate(true);
    
    try {
      const today = checked ? getLocalDateString() : null;
      
      // 패킹리스트 ID 목록 가져오기
      const packingListIds = item.packing_list_ids 
        ? item.packing_list_ids.split(',').map(id => id.trim()).filter(id => id)
        : [];
      
      if (packingListIds.length === 0) {
        // ID가 없으면 코드로 조회
        const packingList = await getPackingListByCode(item.packing_code || item.source_id);
        if (!packingList) {
          throw new Error('패킹리스트를 찾을 수 없습니다.');
        }
        
        // 체크: 지급완료 처리 (날짜 저장)
        if (checked) {
          await updatePackingList(packingList.id, {
            wk_payment_date: today,
          });
        } else {
          // 체크 해제: 지급완료 취소 (날짜 삭제)
          await updatePackingList(packingList.id, {
            wk_payment_date: null,
          });
        }
      } else {
        // 모든 패킹리스트 ID에 대해 업데이트
        const updatePromises = packingListIds.map(async (idStr) => {
          const id = parseInt(idStr, 10);
          if (isNaN(id)) return;
          
          if (checked) {
            await updatePackingList(id, {
              wk_payment_date: today,
            });
          } else {
            await updatePackingList(id, {
              wk_payment_date: null,
            });
          }
        });
        
        await Promise.all(updatePromises);
      }
      
      // 로컬 상태 업데이트
      setPaymentDate(today);
      
      // 부모 컴포넌트의 item 업데이트
      if (onItemUpdate) {
        onItemUpdate(item.id, {
          wk_payment_date: today,
        });
      }
      
      // 통계 카드만 업데이트 (전체 리로드 없이)
      if (onStatisticsRefresh) {
        onStatisticsRefresh();
      }
    } catch (error: any) {
      // 실패 시 롤백
      alert(error.message || '지급완료 처리에 실패했습니다.');
      setIsPaymentDateChecked(previousChecked);
      setPaymentDate(previousPaymentDate);
      // 부모 컴포넌트도 롤백
      if (onItemUpdate) {
        onItemUpdate(item.id, {
          wk_payment_date: previousPaymentDate,
        });
      }
    } finally {
      setIsUpdatingPaymentDate(false);
    }
  };

  // 지급완료 핸들러 (낙관적 업데이트 적용)
  const handleCompleteRequest = async (
    requestId: number,
    paymentType: 'advance' | 'balance' | 'shipping'
  ) => {
    let paymentTypeLabel = '';
    if (paymentType === 'advance') {
      paymentTypeLabel = '선금';
    } else if (paymentType === 'balance') {
      paymentTypeLabel = '잔금';
    } else {
      paymentTypeLabel = '배송비';
    }

    if (!confirm(`${paymentTypeLabel} 지급을 완료 처리하시겠습니까? (지급일: 오늘)`)) {
      return;
    }

    try {
      // 오늘 날짜로 자동 설정
      const today = getLocalDateString();
      const completedRequest = await completePaymentRequest(requestId, {
        payment_date: today,
      });

      // 부모 컴포넌트의 item 업데이트
      if (onItemUpdate) {
        if (paymentType === 'advance') {
          onItemUpdate(item.id, {
            advance_payment_request: completedRequest ? {
              id: completedRequest.id,
              request_number: completedRequest.request_number,
              status: completedRequest.status,
            } : undefined,
            advance_status: 'paid',
            advance_payment_date: today,
          });
        } else if (paymentType === 'balance') {
          onItemUpdate(item.id, {
            balance_payment_request: completedRequest ? {
              id: completedRequest.id,
              request_number: completedRequest.request_number,
              status: completedRequest.status,
            } : undefined,
            balance_status: 'paid',
            balance_payment_date: today,
          });
        } else {
          // shipping (패킹리스트)
          onItemUpdate(item.id, {
            payment_request: completedRequest ? {
              id: completedRequest.id,
              request_number: completedRequest.request_number,
              status: completedRequest.status,
            } : undefined,
            wk_payment_date: today,
          });
        }
      }

      // 통계 카드만 업데이트 (전체 리로드 없이)
      if (onStatisticsRefresh) {
        onStatisticsRefresh();
      }
    } catch (error: any) {
      alert(error.message || '지급완료 처리에 실패했습니다.');
    }
  };


  // 발주관리인 경우 새로운 구조로 표시
  if (item.source_type === 'purchase_order') {
    return (
      <>
        <tr className="hover:bg-gray-50">
          <td className="px-4 py-3">
            <button
              onClick={onToggleExpand}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </td>
          <td className="px-4 py-3 text-sm text-gray-900">
            발주관리
          </td>
          <td className="px-4 py-3">
            {item.product_main_image ? (
              <img
                src={getFullImageUrl(item.product_main_image)}
                alt={item.product_name || ''}
                className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleProductClick}
                onContextMenu={handleContextMenu}
                onError={(e) => {
                  // 이미지 로딩 실패 시 대체 UI 표시
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.image-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'image-error w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:bg-gray-200';
                    errorDiv.textContent = '이미지 없음';
                    errorDiv.onclick = handleProductClick;
                    errorDiv.oncontextmenu = handleContextMenu;
                    parent.appendChild(errorDiv);
                  }
                }}
                title="클릭: 모달로 보기 | Ctrl+클릭: 새 탭에서 열기"
              />
            ) : (
              <div 
                className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={handleProductClick}
                onContextMenu={handleContextMenu}
                title="클릭: 모달로 보기 | Ctrl+클릭: 새 탭에서 열기"
              >
                이미지 없음
              </div>
            )}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900">
            {item.product_name ? (
              <button
                onClick={handleProductClick}
                onContextMenu={handleContextMenu}
                className="text-left hover:text-purple-600 hover:underline transition-colors cursor-pointer"
                title="클릭: 모달로 보기 | Ctrl+클릭: 새 탭에서 열기"
              >
                {item.product_name}
              </button>
            ) : (
              '-'
            )}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
            {item.po_number || '-'}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {item.expected_final_unit_price !== undefined
              ? `¥${item.expected_final_unit_price.toFixed(2)}`
              : '-'}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {item.quantity !== undefined ? `${item.quantity.toLocaleString()}개` : '-'}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
            {item.final_payment_amount !== undefined
              ? `¥${item.final_payment_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {item.advance_payment_amount ? `¥${item.advance_payment_amount.toLocaleString()}` : '-'}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col gap-1">
              {item.advance_payment_amount && (
                <>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs ${
                      item.advance_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {item.advance_status === 'paid' 
                      ? `지급완료${item.advance_payment_date ? ` (${formatDateKST(item.advance_payment_date)})` : ''}`
                      : '지급대기'}
                  </span>
                  {item.advance_payment_request && (
                    <div className="flex items-center gap-1">
                      <PaymentRequestStatusBadge
                        status={item.advance_payment_request.status}
                        size="xs"
                      />
                      {item.advance_payment_request.status === '요청중' && (
                        <>
                          <button
                            onClick={() => handleCompleteRequest(item.advance_payment_request!.id, 'advance')}
                            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-green-300 hover:bg-green-50"
                            title="지급완료"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCancelRequest(item.advance_payment_request!.id, 'advance')}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-50"
                            title="요청 취소"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {isAdminLevelA && item.advance_status === 'pending' && !item.advance_payment_request && (
                    <button
                      onClick={() => {
                        onRequestPayment(
                          item.source_type,
                          item.source_id,
                          'advance',
                          item.advance_payment_amount || 0,
                          {
                            po_number: item.po_number,
                            product_name: item.product_name,
                            payment_type_label: '선금',
                          }
                        );
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2 py-1 rounded border border-purple-300 hover:bg-purple-50"
                    >
                      <Plus className="w-3 h-3" />
                      선금 요청
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {item.balance_payment_amount ? `¥${item.balance_payment_amount.toLocaleString()}` : '-'}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-col gap-1">
              {item.balance_payment_amount && (
                <>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs ${
                      item.balance_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {item.balance_status === 'paid'
                      ? `지급완료${item.balance_payment_date ? ` (${formatDateKST(item.balance_payment_date)})` : ''}`
                      : '지급대기'}
                  </span>
                  {item.balance_payment_request && (
                    <div className="flex items-center gap-1">
                      <PaymentRequestStatusBadge
                        status={item.balance_payment_request.status}
                        size="xs"
                      />
                      {item.balance_payment_request.status === '요청중' && (
                        <>
                          <button
                            onClick={() => handleCompleteRequest(item.balance_payment_request!.id, 'balance')}
                            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-green-300 hover:bg-green-50"
                            title="지급완료"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCancelRequest(item.balance_payment_request!.id, 'balance')}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-50"
                            title="요청 취소"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {isAdminLevelA && item.balance_status === 'pending' && !item.balance_payment_request && (
                    <button
                      onClick={() => {
                        onRequestPayment(
                          item.source_type,
                          item.source_id,
                          'balance',
                          item.balance_payment_amount || 0,
                          {
                            po_number: item.po_number,
                            product_name: item.product_name,
                            payment_type_label: '잔금',
                          }
                        );
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2 py-1 rounded border border-purple-300 hover:bg-purple-50"
                    >
                      <Plus className="w-3 h-3" />
                      잔금 요청
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
          {!isLevelC && (
            <>
              <td className="px-4 py-3 text-sm text-gray-900">
                <div className="flex items-center justify-end gap-3">
                  <span className="text-right">
                    {item.admin_total_cost ? `¥${item.admin_total_cost.toLocaleString()}` : '-'}
                  </span>
                  {item.source_type === 'purchase_order' && item.admin_total_cost && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminCostPaid}
                        onChange={handleAdminCostPaidChange}
                        disabled={isUpdating}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="ml-2 text-xs text-gray-600">지불완료</span>
                    </label>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {item.source_type === 'purchase_order' && item.admin_total_cost ? (
                  adminCostPaid && adminCostPaidDate ? (
                    <span className="text-gray-700">
                      {formatDateKST(adminCostPaidDate)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </>
          )}
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={isLevelC ? 9 : 11} className="px-4 py-4 bg-gray-50">
              <PaymentHistoryDetail item={item} />
            </td>
          </tr>
        )}
      </>
    );
  }

  // 패킹리스트인 경우 새로운 구조
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          패킹리스트
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
          {item.packing_code || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          {item.logistics_company || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {item.actual_weight ? `${item.actual_weight.toLocaleString()}kg` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {item.weight_ratio ? `${item.weight_ratio.toFixed(2)}%` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {item.calculated_weight ? `${item.calculated_weight.toLocaleString()}kg` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {item.pl_shipping_cost ? `¥${item.pl_shipping_cost.toLocaleString()}` : '-'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <label className={`flex items-center ${isLevelC || item.wk_payment_date ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={isPaymentRequestChecked}
                onChange={handlePaymentRequestCheckboxChange}
                disabled={isLevelC || isUpdatingPaymentRequest || (item.payment_request?.status === '완료') || !!item.wk_payment_date}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
            {item.payment_request && (
              <div className="flex items-center gap-1">
                <PaymentRequestStatusBadge
                  status={item.payment_request.status}
                  size="xs"
                />
                {item.payment_request.status === '요청중' && (
                  <>
                    <button
                      onClick={() => handleCompleteRequest(item.payment_request!.id, 'shipping')}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-green-300 hover:bg-green-50"
                      title="지급완료"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleCancelRequest(item.payment_request!.id, 'shipping')}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-50"
                      title="요청 취소"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs ${
              item.wk_payment_date
                ? 'bg-green-100 text-green-800'
                : item.payment_request && item.payment_request.status === '요청중'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {item.wk_payment_date
              ? '지급완료'
              : item.payment_request && item.payment_request.status === '요청중'
              ? '지급요청중'
              : '지급대기'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <label className={`flex items-center ${isLevelC ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={isPaymentDateChecked}
                onChange={handlePaymentDateCheckboxChange}
                disabled={isLevelC || isUpdatingPaymentDate}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
            {isPaymentDateChecked && paymentDate ? (
              <span className="text-gray-700">{formatDateKST(paymentDate)}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </td>
        {!isLevelC && (
          <>
            <td className="px-4 py-3 text-sm text-gray-900 text-right">
              {item.shipping_cost_difference ? `¥${item.shipping_cost_difference.toLocaleString()}` : '-'}
            </td>
            <td className="px-4 py-3">
              {/* 패킹리스트의 A레벨 관리자 비용 지불완료 체크박스 */}
              {item.shipping_cost_difference ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={adminCostPaid}
                    onChange={handlePackingListAdminCostPaidChange}
                    disabled={isUpdating}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-xs text-gray-600">지불완료</span>
                </div>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-900">
              {/* 패킹리스트의 A레벨 관리자 비용 지불 날짜 */}
              {adminCostPaid && adminCostPaidDate ? (
                <span className="text-gray-700">{formatDateKST(adminCostPaidDate)}</span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
          </>
        )}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={isLevelC ? 11 : 14} className="px-4 py-4 bg-gray-50">
            <PaymentHistoryDetail item={item} />
          </td>
        </tr>
      )}
    </>
  );
}

