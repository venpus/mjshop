/**
 * 발주 목록 화면
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  ViewStyle,
} from 'react-native';
import { Container, Header, Input, Loading, ErrorDisplay, Button, BottomSheet, FAB, Checkbox } from '../components/common';
import { PurchaseOrderCard } from '../components/purchase-order/PurchaseOrderCard';
import { useAuth } from '../contexts';
import { useLanguage } from '../contexts';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { colors, spacing } from '../constants';
import { 
  getPurchaseOrders, 
  createReorderPurchaseOrder, 
  confirmPurchaseOrders,
  unconfirmPurchaseOrders,
  deletePurchaseOrders,
  type PurchaseOrderListItem 
} from '../api/purchaseOrderApi';
import { getFullImageUrl, API_BASE_URL } from '../config/constants';
import {
  calculateBasicCostTotal,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
  calculateFactoryStatusFromQuantity,
  calculateWorkStatus,
} from '../utils/purchaseOrderCalculations';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type PurchaseOrdersScreenProps = NativeStackScreenProps<AdminStackParamList, 'PurchaseOrders'>;

type PurchaseOrder = PurchaseOrderListItem;

const ITEMS_PER_PAGE = 20;

const PurchaseOrdersScreen: React.FC<PurchaseOrdersScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { openDrawer } = useMenuDrawer();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // 입력 중인 검색어
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // 실제 검색에 사용되는 검색어
  const [isFilterOpen, setIsFilterOpen] = useState(false); // 필터 바텀시트 열림/닫힘
  const [filters, setFilters] = useState({
    orderStatus: [] as string[], // 발주 상태 필터 (다중 선택) - 실제 적용된 필터
  });
  const [tempFilters, setTempFilters] = useState({
    orderStatus: [] as string[], // 임시 필터 상태 (바텀시트 내부에서만 사용)
  });
  // 선택 모드 관련 상태
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isReordering, setIsReordering] = useState(false); // 재발주 진행 중
  const [isProcessing, setIsProcessing] = useState(false); // 일괄 작업 진행 중

  const loadPurchaseOrders = useCallback(async (page: number = 1, search: string = '', append: boolean = false, orderStatusFilters: string[] = []) => {
    try {
      setError(null);
      
      // 추가 로딩 중일 때는 loadingMore를 true로 설정
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const result = await getPurchaseOrders(page, ITEMS_PER_PAGE, search);
      
      // 발주 상태 필터 적용 (다중 선택)
      let filteredData = result.data;
      if (orderStatusFilters.length > 0) {
        filteredData = filteredData.filter(item => orderStatusFilters.includes(item.order_status));
      }
      
      // 최신순으로 정렬 (order_date 또는 created_at 기준)
      const sortedData = [...filteredData].sort((a, b) => {
        // order_date가 있으면 order_date 기준, 없으면 created_at 기준
        const dateA = a.order_date ? new Date(a.order_date).getTime() : 0;
        const dateB = b.order_date ? new Date(b.order_date).getTime() : 0;
        
        // 최신순 (내림차순)
        return dateB - dateA;
      });
      
      if (append) {
        // 기존 데이터에 추가
        setPurchaseOrders(prev => [...prev, ...sortedData]);
      } else {
        // 새로 로드 (검색 또는 초기 로드)
        setPurchaseOrders(sortedData);
      }
      
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
      setHasMore(page < result.totalPages);
    } catch (err: any) {
      setError(err.message || '발주 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadPurchaseOrders(1, '', false, filters.orderStatus);
  }, []); // 컴포넌트 마운트 시에만 실행

  // 활성 검색어 또는 필터가 변경되면 검색 실행
  useEffect(() => {
    // 활성 검색어 또는 필터가 변경되면 첫 페이지부터 다시 로드
    setCurrentPage(1);
    setPurchaseOrders([]);
    loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
  }, [activeSearchTerm, filters.orderStatus, loadPurchaseOrders]);

  // 화면이 포커스될 때 새로고침 (발주 생성 후 목록으로 돌아올 때)
  useFocusEffect(
    useCallback(() => {
      // route.params에서 shouldRefresh 플래그 확인
      if (route.params?.shouldRefresh) {
        // 플래그 제거 (다음 포커스 시에는 새로고침하지 않음)
        navigation.setParams({ shouldRefresh: false });
        // 목록 새로고침
        setCurrentPage(1);
        setPurchaseOrders([]);
        loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
      }
    }, [route.params?.shouldRefresh, navigation, activeSearchTerm, filters.orderStatus, loadPurchaseOrders])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    setPurchaseOrders([]);
    loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
  }, [activeSearchTerm, filters.orderStatus, loadPurchaseOrders]);

  // 검색어 입력 핸들러
  const handleSearchInputChange = useCallback((text: string) => {
    setSearchInput(text);
  }, []);

  // 검색 실행 핸들러 (검색 버튼 클릭 또는 엔터키 입력)
  const handleSearchSubmit = useCallback(() => {
    const trimmedSearch = searchInput.trim();
    setActiveSearchTerm(trimmedSearch);
  }, [searchInput]);

  // 검색어 초기화 핸들러
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setActiveSearchTerm('');
  }, []);

  // 필터 바텀시트 열기 핸들러
  const handleOpenFilter = useCallback(() => {
    // 현재 필터를 임시 필터로 복사
    setTempFilters({
      orderStatus: [...filters.orderStatus],
    });
    setIsFilterOpen(true);
  }, [filters.orderStatus]);

  // 필터 바텀시트 닫기 핸들러 (적용)
  const handleCloseFilter = useCallback(() => {
    // 임시 필터를 실제 필터에 적용
    setFilters({
      orderStatus: [...tempFilters.orderStatus],
    });
    setIsFilterOpen(false);
  }, [tempFilters.orderStatus]);

  // 필터 바텀시트 닫기 핸들러 (취소)
  const handleCancelFilter = useCallback(() => {
    // 임시 필터를 실제 필터로 복원 (변경사항 취소)
    setTempFilters({
      orderStatus: [...filters.orderStatus],
    });
    setIsFilterOpen(false);
  }, [filters.orderStatus]);

  // 필터 토글 핸들러 (임시 필터만 변경)
  const toggleFilter = useCallback((category: 'orderStatus', value: string) => {
    setTempFilters(prev => {
      const current = prev[category] || [];
      const newFilters = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      return {
        ...prev,
        [category]: newFilters,
      };
    });
  }, []);

  // 모든 필터 초기화 (임시 필터만 초기화)
  const clearAllFilters = useCallback(() => {
    setTempFilters({
      orderStatus: [],
    });
  }, []);

  // 활성 필터 개수 계산
  const activeFilterCount = useMemo(() => filters.orderStatus.length, [filters.orderStatus]);

  // 선택 모드 진입
  const handleEnterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedOrderIds(new Set());
  }, []);

  // 선택 모드 종료
  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedOrderIds(new Set());
  }, []);

  // 체크박스 토글 핸들러 (다중 선택)
  const handleToggleCheckbox = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  // 전체 선택/해제
  const handleToggleSelectAll = useCallback(() => {
    if (selectedOrderIds.size === purchaseOrders.length) {
      // 전체 해제
      setSelectedOrderIds(new Set());
    } else {
      // 전체 선택
      setSelectedOrderIds(new Set(purchaseOrders.map(item => item.id)));
    }
  }, [selectedOrderIds.size, purchaseOrders]);

  // 재발주 핸들러 (1개만 선택 가능)
  const handleReorder = useCallback(async () => {
    const selectedArray = Array.from(selectedOrderIds);
    if (selectedArray.length !== 1) return;

    if (!confirm('선택한 발주를 재발주하시겠습니까?')) {
      return;
    }

    try {
      setIsReordering(true);
      const newOrder = await createReorderPurchaseOrder(selectedArray[0]);
      
      // 성공 메시지
      alert('재발주가 성공적으로 생성되었습니다.');
      
      // 선택 모드 종료
      handleExitSelectionMode();
      
      // 목록 새로고침
      setCurrentPage(1);
      setPurchaseOrders([]);
      await loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
      
      // 새 발주 상세 페이지로 이동
      navigation.navigate('PurchaseOrderDetail', { id: newOrder.id });
    } catch (error: any) {
      console.error('재발주 오류:', error);
      alert(error.message || '재발주 중 오류가 발생했습니다.');
    } finally {
      setIsReordering(false);
    }
  }, [selectedOrderIds, activeSearchTerm, filters.orderStatus, loadPurchaseOrders, navigation, handleExitSelectionMode]);

  // 일괄 컨펌 핸들러 (하이브리드: 일괄 처리 API 우선, 실패 시 개별 요청)
  const handleConfirmOrders = useCallback(async () => {
    const selectedArray = Array.from(selectedOrderIds);
    if (selectedArray.length === 0) return;

    Alert.alert(
      '발주 컨펌 확인',
      `선택한 ${selectedArray.length}개의 발주를 컨펌하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              // 일괄 처리 API 시도
              try {
                await confirmPurchaseOrders(selectedArray);
                Alert.alert('성공', `${selectedArray.length}개의 발주가 컨펌되었습니다.`);
              } catch (batchError: any) {
                // 일괄 처리 실패 시 개별 요청으로 폴백
                console.warn('일괄 컨펌 실패, 개별 요청으로 전환:', batchError);
                
                const updatePromises = selectedArray.map(orderId =>
                  fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      is_confirmed: true,
                      order_status: '발주확인',
                    }),
                  })
                );

                const responses = await Promise.all(updatePromises);
                
                // 응답 확인
                const errors: string[] = [];
                for (let i = 0; i < responses.length; i++) {
                  if (!responses[i].ok) {
                    const errorData = await responses[i].json().catch(() => ({}));
                    errors.push(`${selectedArray[i]}: ${errorData.error || '업데이트 실패'}`);
                  } else {
                    const data = await responses[i].json();
                    if (!data.success) {
                      errors.push(`${selectedArray[i]}: ${data.error || '업데이트 실패'}`);
                    }
                  }
                }

                if (errors.length > 0) {
                  throw new Error(`일부 발주 컨펌에 실패했습니다:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...외 ${errors.length - 3}개` : ''}`);
                }

                Alert.alert('성공', `${selectedArray.length}개의 발주가 컨펌되었습니다. (개별 처리)`);
              }
              
              // 선택 모드 종료
              handleExitSelectionMode();
              
              // 목록 새로고침
              setCurrentPage(1);
              setPurchaseOrders([]);
              await loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
            } catch (error: any) {
              console.error('컨펌 오류:', error);
              Alert.alert('오류', error.message || '컨펌 중 오류가 발생했습니다.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedOrderIds, activeSearchTerm, filters.orderStatus, loadPurchaseOrders, handleExitSelectionMode]);

  // 일괄 컨펌 해제 핸들러 (하이브리드: 일괄 처리 API 우선, 실패 시 개별 요청)
  const handleUnconfirmOrders = useCallback(async () => {
    const selectedArray = Array.from(selectedOrderIds);
    if (selectedArray.length === 0) return;

    Alert.alert(
      '발주 컨펌 해제',
      `선택한 ${selectedArray.length}개의 발주 컨펌을 해제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              // 일괄 처리 API 시도
              try {
                await unconfirmPurchaseOrders(selectedArray);
                Alert.alert('성공', `${selectedArray.length}개의 발주 컨펌이 해제되었습니다.`);
              } catch (batchError: any) {
                // 일괄 처리 실패 시 개별 요청으로 폴백
                console.warn('일괄 처리 실패, 개별 요청으로 전환:', batchError);
                
                // API_BASE_URL은 이미 import됨
                const updatePromises = selectedArray.map(orderId =>
                  fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      is_confirmed: false,
                    }),
                  })
                );

                const responses = await Promise.all(updatePromises);
                
                // 응답 확인
                const errors: string[] = [];
                for (let i = 0; i < responses.length; i++) {
                  if (!responses[i].ok) {
                    const errorData = await responses[i].json().catch(() => ({}));
                    errors.push(`${selectedArray[i]}: ${errorData.error || '업데이트 실패'}`);
                  } else {
                    const data = await responses[i].json();
                    if (!data.success) {
                      errors.push(`${selectedArray[i]}: ${data.error || '업데이트 실패'}`);
                    }
                  }
                }

                if (errors.length > 0) {
                  throw new Error(`일부 발주 컨펌 해제에 실패했습니다:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...외 ${errors.length - 3}개` : ''}`);
                }

                Alert.alert('성공', `${selectedArray.length}개의 발주 컨펌이 해제되었습니다.`);
              }
              
              // 선택 모드 종료
              handleExitSelectionMode();
              
              // 목록 새로고침
              setCurrentPage(1);
              setPurchaseOrders([]);
              await loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
            } catch (error: any) {
              console.error('컨펌 해제 오류:', error);
              Alert.alert('오류', error.message || '컨펌 해제 중 오류가 발생했습니다.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedOrderIds, activeSearchTerm, filters.orderStatus, loadPurchaseOrders, handleExitSelectionMode]);

  // 일괄 삭제 핸들러 (하이브리드: 일괄 처리 API 우선, 실패 시 개별 요청)
  const handleDeleteOrders = useCallback(async () => {
    const selectedArray = Array.from(selectedOrderIds);
    if (selectedArray.length === 0) return;

    Alert.alert(
      '발주 삭제 확인',
      `선택한 ${selectedArray.length}개의 발주를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련 이미지도 모두 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제하기',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              
              // 일괄 처리 API 시도
              try {
                await deletePurchaseOrders(selectedArray);
                Alert.alert('성공', `${selectedArray.length}개의 발주가 삭제되었습니다.`);
              } catch (batchError: any) {
                // 일괄 처리 실패 시 개별 요청으로 폴백
                console.warn('일괄 처리 실패, 개별 요청으로 전환:', batchError);
                
                // API_BASE_URL은 이미 import됨
                const deletePromises = selectedArray.map(orderId =>
                  fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  })
                );

                const responses = await Promise.all(deletePromises);
                
                // 응답 확인
                const errors: string[] = [];
                for (let i = 0; i < responses.length; i++) {
                  if (!responses[i].ok) {
                    const errorData = await responses[i].json().catch(() => ({}));
                    errors.push(`${selectedArray[i]}: ${errorData.error || '삭제 실패'}`);
                  } else {
                    const data = await responses[i].json();
                    if (!data.success) {
                      errors.push(`${selectedArray[i]}: ${data.error || '삭제 실패'}`);
                    }
                  }
                }

                if (errors.length > 0) {
                  throw new Error(`일부 발주 삭제에 실패했습니다:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...외 ${errors.length - 3}개` : ''}`);
                }

                Alert.alert('성공', `${selectedArray.length}개의 발주가 삭제되었습니다.`);
              }
              
              // 선택 모드 종료
              handleExitSelectionMode();
              
              // 목록 새로고침
              setCurrentPage(1);
              setPurchaseOrders([]);
              await loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus);
            } catch (error: any) {
              console.error('삭제 오류:', error);
              Alert.alert('오류', error.message || '삭제 중 오류가 발생했습니다.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  }, [selectedOrderIds, activeSearchTerm, filters.orderStatus, loadPurchaseOrders, handleExitSelectionMode]);

  // 발주 생성 핸들러
  const handleCreateOrder = useCallback(() => {
    navigation.navigate('CreatePurchaseOrder');
  }, [navigation]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadPurchaseOrders(nextPage, activeSearchTerm, true, filters.orderStatus);
    }
  }, [currentPage, activeSearchTerm, filters.orderStatus, loadingMore, hasMore, loading, refreshing, loadPurchaseOrders]);

  const handleItemPress = useCallback((orderId: string) => {
    // 선택 모드일 때는 선택/해제만 수행
    if (isSelectionMode) {
      handleToggleCheckbox(orderId);
    } else {
      navigation.navigate('PurchaseOrderDetail', { id: orderId });
    }
  }, [isSelectionMode, navigation, handleToggleCheckbox]);

  const getStatusStyle = (status: string): ViewStyle => {
    const statusKey = `status_${status}` as keyof typeof styles;
    const style = styles[statusKey] as ViewStyle | undefined;
    return style || (styles.statusDefault as ViewStyle);
  };

  const renderItem = ({ item }: { item: PurchaseOrder }) => {
    const isSelected = selectedOrderIds.has(item.id);

    return (
      <PurchaseOrderCard
        item={item}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        onPress={handleItemPress}
        onToggleCheckbox={handleToggleCheckbox}
        getStatusStyle={getStatusStyle}
        calculateBasicCostTotal={calculateBasicCostTotal}
        calculateShippingCostTotal={calculateShippingCostTotal}
        calculateFinalPaymentAmount={calculateFinalPaymentAmount}
        calculateExpectedFinalUnitPrice={calculateExpectedFinalUnitPrice}
        calculateFactoryStatusFromQuantity={calculateFactoryStatusFromQuantity}
        calculateWorkStatus={calculateWorkStatus}
      />
    );
  };

  if (loading && !refreshing) {
    return (
      <Container safeArea>
        <Header
          title={t('menu.purchaseOrders') || '발주 관리'}
          leftButton={{
            label: '☰',
            onPress: openDrawer,
          }}
        />
        <Loading message="로딩 중..." />
      </Container>
    );
  }

  return (
    <Container safeArea padding={false}>
      <Header
        title={
          isSelectionMode
            ? `선택됨: ${selectedOrderIds.size}개`
            : t('menu.purchaseOrders') || '발주 관리'
        }
        leftButton={
          isSelectionMode
            ? {
                label: '취소',
                onPress: handleExitSelectionMode,
              }
            : {
                label: '☰',
                onPress: openDrawer,
              }
        }
        rightButton={
          isSelectionMode
            ? {
                label: selectedOrderIds.size === purchaseOrders.length ? '전체해제' : '전체선택',
                onPress: handleToggleSelectAll,
              }
            : {
                label: '선택',
                onPress: handleEnterSelectionMode,
              }
        }
      />

      {/* 검색 및 필터 바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.searchTextInput}
              placeholder={t('common.search') || '검색...'}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={handleSearchInputChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearSearch}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <Button
            title={t('common.search') || '검색'}
            onPress={handleSearchSubmit}
            variant="primary"
            size="sm"
            style={styles.searchButton}
          />
          <TouchableOpacity
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={handleOpenFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.filterButtonText}>
              필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 필터 바텀시트 */}
      <BottomSheet
        visible={isFilterOpen}
        onClose={handleCancelFilter}
        title={`필터 옵션${tempFilters.orderStatus.length > 0 ? ` (${tempFilters.orderStatus.length})` : ''}`}
      >
        <View style={styles.filterContent}>
          {/* 발주 상태 필터 */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>📋 발주 상태</Text>
            <View style={styles.filterOptions}>
              {['발주 대기', '발주확인', '취소됨'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    tempFilters.orderStatus.includes(status) && styles.filterOptionActive,
                  ]}
                  onPress={() => toggleFilter('orderStatus', status)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      tempFilters.orderStatus.includes(status) && styles.filterOptionTextActive,
                    ]}
                  >
                    {tempFilters.orderStatus.includes(status) ? '☑' : '☐'} {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 필터 액션 버튼 */}
          <View style={styles.filterActions}>
            {tempFilters.orderStatus.length > 0 && (
              <Button
                title="전체 초기화"
                onPress={clearAllFilters}
                variant="outline"
                size="md"
                style={styles.clearFiltersButton}
              />
            )}
            <View style={styles.filterActionButtons}>
              <Button
                title="취소"
                onPress={handleCancelFilter}
                variant="outline"
                size="md"
                style={[styles.filterActionButton, styles.cancelButton]}
              />
              <Button
                title="적용"
                onPress={handleCloseFilter}
                variant="primary"
                size="md"
                style={[styles.filterActionButton, styles.applyButton]}
              />
            </View>
          </View>
        </View>
      </BottomSheet>

      {/* 목록 */}
      {error ? (
        <ErrorDisplay message={error} onRetry={() => loadPurchaseOrders(1, activeSearchTerm, false, filters.orderStatus)} />
      ) : (
        <FlatList
          data={purchaseOrders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>발주 내역이 없습니다.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>더 불러오는 중...</Text>
              </View>
            ) : hasMore ? null : purchaseOrders.length > 0 ? (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>모든 발주 내역을 불러왔습니다. ({totalItems}개)</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* 선택 모드일 때 헤더 하단 액션 버튼 */}
      {isSelectionMode && selectedOrderIds.size > 0 && (
        <View style={styles.headerActionBar}>
          <View style={styles.actionButtons}>
            <Button
              title={isReordering ? '처리 중...' : '재발주'}
              onPress={handleReorder}
              variant="primary"
              size="sm"
              style={styles.actionButton}
              disabled={selectedOrderIds.size !== 1 || isReordering || isProcessing}
            />
            <Button
              title={isProcessing ? '처리 중...' : '컨펌'}
              onPress={handleConfirmOrders}
              variant="primary"
              size="sm"
              style={styles.actionButton}
              disabled={isReordering || isProcessing}
            />
            <Button
              title={isProcessing ? '처리 중...' : '컨펌해제'}
              onPress={handleUnconfirmOrders}
              variant="outline"
              size="sm"
              style={styles.actionButton}
              disabled={isReordering || isProcessing}
            />
            <Button
              title={isProcessing ? '처리 중...' : '삭제'}
              onPress={handleDeleteOrders}
              variant="danger"
              size="sm"
              style={styles.actionButton}
              disabled={isReordering || isProcessing}
            />
          </View>
        </View>
      )}

      {/* FAB for Create Order (선택 모드가 아닐 때만 표시) */}
      {!isSelectionMode && (
        <FAB
          onPress={handleCreateOrder}
          icon="+"
          position="bottom-right"
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 6,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    minHeight: 32,
    maxHeight: 32,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: colors.gray900,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearButtonText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchButton: {
    marginTop: 0,
    minWidth: 60,
    paddingHorizontal: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15', // 15% 투명도
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray700,
  },
  filterContent: {
    flex: 1,
  },
  filterGroup: {
    marginBottom: spacing.lg,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    gap: spacing.xs,
  },
  filterOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.gray700,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  filterActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  clearFiltersButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  filterActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterActionButton: {
    flex: 1,
  },
  cancelButton: {
    // outline 스타일은 이미 Button 컴포넌트에 정의됨
  },
  applyButton: {
    // primary 스타일은 이미 Button 컴포넌트에 정의됨
  },
  listContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  itemContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  itemContainerSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08', // 8% 투명도
  },
  checkbox: {
    marginRight: spacing.sm,
  },
  dateHeaderContent: {
    flex: 1,
  },
  cardContentWrapper: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray700,
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  imageSection: {
    width: 100,
    marginRight: spacing.md,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginBottom: spacing.xs,
  },
  productInfoGroup: {
    backgroundColor: '#E0F2FE', // 연한 파란색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs / 2,
    lineHeight: 20,
  },
  productNameChinese: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: spacing.xs / 2,
    lineHeight: 18,
  },
  poNumber: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.gray500,
    marginTop: spacing.xs / 2,
  },
  orderDate: {
    fontSize: 11,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  specsGroup: {
    backgroundColor: '#D1FAE5', // 연한 녹색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  specText: {
    fontSize: 11,
    color: colors.gray700,
    fontWeight: '500',
  },
  quantityInfoGroup: {
    backgroundColor: '#FEF3C7', // 연한 노란색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  quantityLabel: {
    fontSize: 11,
    color: colors.gray700,
    marginBottom: spacing.xs / 2,
    fontWeight: '500',
  },
  quantityDetailsGroup: {
    backgroundColor: '#FCE7F3', // 연한 분홍색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    marginTop: spacing.xs,
  },
  quantityDetailText: {
    fontSize: 10,
    color: colors.gray500,
    marginBottom: spacing.xs / 2,
  },
  priceSection: {
    width: 110,
    alignItems: 'flex-end',
  },
  finalPriceContainer: {
    backgroundColor: '#FED7AA', // 연한 주황색
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  finalPriceLabel: {
    fontSize: 10,
    color: colors.gray700,
    marginBottom: spacing.xs / 2,
  },
  finalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
  },
  paymentAmountContainer: {
    backgroundColor: '#FEE2E2', // 연한 빨간색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
    width: '100%',
  },
  paymentAmountLabel: {
    fontSize: 10,
    color: colors.gray600,
    marginBottom: spacing.xs / 2,
  },
  paymentAmountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray900,
  },
  statusSection: {
    backgroundColor: '#F3E8FF', // 연한 보라색
    padding: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: spacing.xs,
    width: '100%',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 60,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.white,
  },
  status_작업대기: {
    backgroundColor: colors.warning,
  },
  status_작업중: {
    backgroundColor: colors.primary,
  },
  status_완료: {
    backgroundColor: colors.success,
  },
  status_출고대기: {
    backgroundColor: colors.gray500,
  },
  status_배송중: {
    backgroundColor: colors.primary,
  },
  status_수령완료: {
    backgroundColor: colors.success,
  },
  status_발주확인: {
    backgroundColor: colors.success,
  },
  status_발주대기: {
    backgroundColor: colors.warning,
  },
  status_취소됨: {
    backgroundColor: colors.danger,
  },
  status_미결제: {
    backgroundColor: colors.gray500,
  },
  status_선금결제: {
    backgroundColor: colors.primary,
  },
  statusDefault: {
    backgroundColor: colors.gray500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray500,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.gray600,
  },
  endContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: colors.gray500,
  },
  headerActionBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 1001, // FAB보다 위에 표시
    elevation: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
  },
});

export default PurchaseOrdersScreen;

