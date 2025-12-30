import { useState, useEffect, useCallback } from "react";
import type { FactoryShipment, ReturnExchangeItem } from "../components/tabs/FactoryShippingTab";
import type { LaborCostItem } from "../components/tabs/CostPaymentTab";
import type { WorkItem } from "../components/tabs/ProcessingPackagingTab";
import type { DeliverySet } from "../components/tabs/LogisticsDeliveryTab";
import { formatDateForInput } from "../utils/dateUtils";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

interface PurchaseOrderRawData {
  id: number;
  po_number: string;
  supplier?: { name: string };
  product?: { id: string; name: string; main_image?: string };
  product_name?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
  product_main_image?: string;
  unit_price: number;
  quantity: number;
  size?: string;
  weight?: string;
  packaging?: number;
  delivery_status?: string;
  payment_status?: string;
  order_date?: string;
  estimated_delivery?: string;
  back_margin?: number;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  commission_rate?: number;
  commission_type?: string;
  advance_payment_rate?: number;
  advance_payment_date?: string;
  balance_payment_date?: string;
  is_confirmed?: boolean;
  order_status?: '발주확인' | '발주 대기' | '취소됨';
  work_start_date?: string;
  work_end_date?: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplier: string;
  product: string;
  productImage?: string;
  unitPrice: number;
  optionCost: number;
  quantity: number;
  size: string;
  weight: string;
  packaging: number;
  factoryStatus: string;
  workStatus: string;
  deliveryStatus: string;
  paymentStatus: string;
  date: string;
  estimatedDelivery: string;
  notes: string;
  supplierContact: string;
  supplierAddress: string;
  _rawData: PurchaseOrderRawData;
}

export interface UsePurchaseOrderDataReturn {
  order: PurchaseOrder | null;
  isLoading: boolean;
  optionItems: LaborCostItem[];
  laborCostItems: LaborCostItem[];
  factoryShipments: FactoryShipment[];
  returnExchangeItems: ReturnExchangeItem[];
  workItems: WorkItem[];
  deliverySets: DeliverySet[];
  setOptionItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  setLaborCostItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  setFactoryShipments: React.Dispatch<React.SetStateAction<FactoryShipment[]>>;
  setReturnExchangeItems: React.Dispatch<React.SetStateAction<ReturnExchangeItem[]>>;
  setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  setDeliverySets: React.Dispatch<React.SetStateAction<DeliverySet[]>>;
  reloadCostItems: () => Promise<void>;
  reloadFactoryShipments: () => Promise<void>;
  reloadReturnExchanges: () => Promise<void>;
  reloadWorkItems: () => Promise<void>;
  reloadDeliverySets: () => Promise<void>;
  reloadPurchaseOrder: () => Promise<void>;
}

/**
 * Purchase Order 데이터를 로드하는 Hook
 */
export function usePurchaseOrderData(orderId: string | null): UsePurchaseOrderDataReturn {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [optionItems, setOptionItems] = useState<LaborCostItem[]>([]);
  const [laborCostItems, setLaborCostItems] = useState<LaborCostItem[]>([]);
  const [factoryShipments, setFactoryShipments] = useState<FactoryShipment[]>([]);
  const [returnExchangeItems, setReturnExchangeItems] = useState<ReturnExchangeItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [deliverySets, setDeliverySets] = useState<DeliverySet[]>([]);

  // 발주 상세 정보 로드
  useEffect(() => {
    const loadPurchaseOrder = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const url = `${API_BASE_URL}/purchase-orders/${orderId}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '발주 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const po = data.data;
          
          // 서버 응답을 클라이언트 형식으로 변환
          const convertedOrder: PurchaseOrder = {
            id: po.id,
            poNumber: po.po_number,
            supplier: po.supplier?.name || '',
            product: po.product?.name || po.product_name || '',
            productImage: po.product_main_image 
              ? (po.product_main_image.startsWith('http') ? po.product_main_image : `${SERVER_BASE_URL}${po.product_main_image}`)
              : (po.product?.main_image ? (po.product.main_image.startsWith('http') ? po.product.main_image : `${SERVER_BASE_URL}${po.product.main_image}`) : undefined),
            unitPrice: po.unit_price,
            optionCost: 0, // 옵션 비용은 별도로 계산 필요
            quantity: po.quantity,
            size: po.size || '',
            weight: po.weight || '',
            packaging: po.packaging || 0,
            factoryStatus: '출고대기',
            workStatus: '작업대기',
            deliveryStatus: po.delivery_status || '대기중',
            paymentStatus: po.payment_status || '미결제',
            date: formatDateForInput(po.order_date),
            estimatedDelivery: formatDateForInput(po.estimated_delivery),
            notes: '',
            supplierContact: '',
            supplierAddress: '',
            // DB에서 가져온 원본 데이터도 저장 (나중에 수정 시 사용)
            _rawData: po,
          };
          
          setOrder(convertedOrder);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        alert(err.message || '발주 정보를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
        setOrder(null);
      }
    };

    loadPurchaseOrder().catch((err) => {
      setIsLoading(false);
      setOrder(null);
    });
  }, [orderId]);

  // cost items 로드
  const loadCostItems = useCallback(async () => {
    if (!orderId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/cost-items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const costItems = result.data;
          const options: LaborCostItem[] = costItems
            .filter((item: any) => item.item_type === 'option')
            .map((item: any) => ({
              id: item.id.toString(),
              name: item.name,
              unit_price: item.unit_price || 0,
              quantity: item.quantity || 1,
              cost: item.cost || 0,
              isAdminOnly: item.is_admin_only || false,
            }));
          const labors: LaborCostItem[] = costItems
            .filter((item: any) => item.item_type === 'labor')
            .map((item: any) => ({
              id: item.id.toString(),
              name: item.name,
              unit_price: item.unit_price || 0,
              quantity: item.quantity || 1,
              cost: item.cost || 0,
              isAdminOnly: item.is_admin_only || false,
            }));
          setOptionItems(options);
          setLaborCostItems(labors);
        }
      }
    } catch (err) {
      console.error('비용 항목 로드 오류:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      loadCostItems();
    }
  }, [order, loadCostItems]);

  // factory shipments 로드
  const loadFactoryShipments = useCallback(async () => {
    if (!orderId) return;

    try {
      // 업체 출고 항목 조회
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/factory-shipments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 각 출고 항목에 대한 이미지 로드
          const shipmentsWithImages: FactoryShipment[] = await Promise.all(
            result.data.map(async (item: any) => {
              // 이미지 조회
              const imageResponse = await fetch(
                `${API_BASE_URL}/purchase-orders/${orderId}/images/factory_shipment?relatedId=${item.id}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                }
              );

              let images: string[] = [];
              if (imageResponse.ok) {
                const imageResult = await imageResponse.json();
                console.log(`출고 항목 ${item.id} 이미지 조회 결과:`, imageResult);
                if (imageResult.success && imageResult.data && Array.isArray(imageResult.data)) {
                  images = imageResult.data.map((img: any) => {
                    // 응답 형식이 문자열 배열이거나 객체 배열일 수 있음
                    const url = typeof img === 'string' ? img : (img.image_url || img);
                    if (!url || typeof url !== 'string') {
                      console.warn(`출고 항목 ${item.id} 이미지 URL이 없습니다:`, img);
                      return '';
                    }
                    // 이미 전체 URL인 경우 그대로 반환
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      return url;
                    }
                    // 상대 경로인 경우 SERVER_BASE_URL 추가
                    // URL이 '/'로 시작하지 않으면 추가
                    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
                    return `${SERVER_BASE_URL}${normalizedUrl}`;
                  }).filter((url: string) => url !== ''); // 빈 URL 제거
                  console.log(`출고 항목 ${item.id} 변환된 이미지 URL (${images.length}개):`, images);
                } else {
                  console.warn(`출고 항목 ${item.id} 이미지 데이터 형식 오류:`, imageResult);
                }
              } else {
                console.error(`출고 항목 ${item.id} 이미지 조회 실패:`, imageResponse.status, imageResponse.statusText);
                const errorText = await imageResponse.text().catch(() => '');
                console.error('에러 응답:', errorText);
              }

              return {
                id: item.id.toString(),
                date: formatDateForInput(item.shipment_date),
                quantity: item.quantity,
                trackingNumber: item.tracking_number || "",
                receiveDate: formatDateForInput(item.receive_date),
                images: images,
              };
            })
          );

          setFactoryShipments(shipmentsWithImages);
        }
      }
    } catch (err) {
      console.error('업체 출고 항목 로드 오류:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      loadFactoryShipments();
    }
  }, [order, loadFactoryShipments]);

  // return exchanges 로드
  const loadReturnExchanges = useCallback(async () => {
    if (!orderId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/return-exchanges`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 각 항목에 대해 이미지도 함께 로드
          const itemsWithImages = await Promise.all(
            result.data.map(async (item: any) => {
              // 이미지 조회 (쿼리 파라미터 사용)
              const imageResponse = await fetch(
                `${API_BASE_URL}/purchase-orders/${orderId}/images/return_exchange?relatedId=${item.id}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                }
              );

              let images: string[] = [];
              if (imageResponse.ok) {
                const imageResult = await imageResponse.json();
                console.log(`반품/교환 항목 ${item.id} 이미지 조회 결과:`, imageResult);
                if (imageResult.success && imageResult.data) {
                  images = imageResult.data.map((img: any) => {
                    const url = typeof img === 'string' ? img : img.image_url;
                    return url.startsWith('http') ? url : `${SERVER_BASE_URL}${url}`;
                  });
                  console.log(`반품/교환 항목 ${item.id} 변환된 이미지 URL:`, images);
                }
              } else {
                console.error(`반품/교환 항목 ${item.id} 이미지 조회 실패:`, imageResponse.status);
                const errorText = await imageResponse.text().catch(() => '');
                console.error('에러 응답:', errorText);
              }

              return {
                id: item.id.toString(),
                date: formatDateForInput(item.return_date),
                quantity: item.quantity,
                trackingNumber: item.tracking_number || "",
                receiveDate: formatDateForInput(item.receive_date),
                images: images,
              };
            })
          );
          
          const items: ReturnExchangeItem[] = itemsWithImages;
          setReturnExchangeItems(items);
        }
      }
    } catch (err) {
      console.error('반품/교환 항목 로드 오류:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      loadReturnExchanges();
    }
  }, [order, loadReturnExchanges]);

  // work items 로드
  const loadWorkItems = useCallback(async () => {
    if (!orderId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/work-items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('작업 항목 로드 결과:', result);
        if (result.success && result.data) {
          // 각 항목에 대해 이미지도 함께 로드
          const itemsWithImages: WorkItem[] = await Promise.all(
            result.data.map(async (item: any) => {
              // 이미지 조회 (쿼리 파라미터 사용)
              const imageResponse = await fetch(
                `${API_BASE_URL}/purchase-orders/${orderId}/images/work_item?relatedId=${item.id}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                }
              );

              let images: string[] = [];
              if (imageResponse.ok) {
                const imageResult = await imageResponse.json();
                console.log(`작업 항목 ${item.id} 이미지 조회 결과:`, imageResult);
                if (imageResult.success && imageResult.data && Array.isArray(imageResult.data)) {
                  images = imageResult.data.map((img: any) => {
                    const url = typeof img === 'string' ? img : (img.image_url || img);
                    if (!url || typeof url !== 'string') {
                      console.warn(`작업 항목 ${item.id} 이미지 URL이 없습니다:`, img);
                      return '';
                    }
                    // 이미 전체 URL인 경우 그대로 반환
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      return url;
                    }
                    // 상대 경로인 경우 SERVER_BASE_URL 추가
                    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
                    return `${SERVER_BASE_URL}${normalizedUrl}`;
                  }).filter((url: string) => url !== '');
                  console.log(`작업 항목 ${item.id} 변환된 이미지 URL (${images.length}개):`, images);
                } else {
                  console.warn(`작업 항목 ${item.id} 이미지 데이터 형식 오류:`, imageResult);
                }
              } else {
                console.error(`작업 항목 ${item.id} 이미지 조회 실패:`, imageResponse.status, imageResponse.statusText);
                const errorText = await imageResponse.text().catch(() => '');
                console.error('에러 응답:', errorText);
              }

              return {
                id: item.id.toString(),
                images: images,
                descriptionKo: item.description_ko || "",
                descriptionZh: item.description_zh || "",
                isCompleted: item.is_completed || false,
              };
            })
          );

          setWorkItems(itemsWithImages);
        }
      }
    } catch (err) {
      console.error('작업 항목 로드 오류:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      loadWorkItems();
    }
  }, [order, loadWorkItems]);

  // delivery sets 로드
  const loadDeliverySets = useCallback(async () => {
    if (!orderId) {
      console.log('[usePurchaseOrderData] loadDeliverySets: orderId가 없어서 종료');
      return;
    }

    console.log('[usePurchaseOrderData] loadDeliverySets 시작, orderId:', orderId);
    console.log('[usePurchaseOrderData] API_BASE_URL:', API_BASE_URL);

    try {
      const url = `${API_BASE_URL}/purchase-orders/${orderId}/delivery-sets`;
      console.log('[usePurchaseOrderData] delivery sets 조회 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[usePurchaseOrderData] delivery sets 조회 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('[usePurchaseOrderData] delivery sets 조회 응답:', result);
        console.log('[usePurchaseOrderData] result.success:', result.success);
        console.log('[usePurchaseOrderData] result.data:', result.data);
        console.log('[usePurchaseOrderData] result.data 길이:', result.data?.length || 0);
        
        if (result.success && result.data) {
          // 각 delivery set에 대해 이미지도 함께 로드
          const setsWithImages: DeliverySet[] = await Promise.all(
            result.data.map(async (set: any) => {
              // package_info 변환
              const packageInfoList = (set.package_info || []).map((pkg: any) => ({
                id: pkg.id.toString(),
                types: pkg.types || "",
                pieces: pkg.pieces || "",
                sets: pkg.sets || "",
                total: pkg.total || "",
                method: (pkg.method || '박스') as '박스' | '마대',
                count: pkg.count || null,
                weight: pkg.weight || "",
              }));

              // logistics_info 변환 (이미지 포함)
              const logisticsInfoList = await Promise.all(
                (set.logistics_info || []).map(async (log: any) => {
                  // 이미지 조회
                  const imageResponse = await fetch(
                    `${API_BASE_URL}/purchase-orders/${orderId}/images/logistics_info?relatedId=${log.id}`,
                    {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                    }
                  );

                  let images: string[] = [];
                  if (imageResponse.ok) {
                    const imageResult = await imageResponse.json();
                    if (imageResult.success && imageResult.data && Array.isArray(imageResult.data)) {
                      images = imageResult.data.map((img: any) => {
                        const url = typeof img === 'string' ? img : (img.image_url || img);
                        if (!url || typeof url !== 'string') return '';
                        if (url.startsWith('http://') || url.startsWith('https://')) return url;
                        const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
                        return `${SERVER_BASE_URL}${normalizedUrl}`;
                      }).filter((url: string) => url !== '');
                    }
                  }

                  return {
                    id: log.id.toString(),
                    trackingNumber: log.tracking_number || "",
                    inlandCompanyId: log.inland_company_id || null,
                    inlandCompanyName: log.inland_company_name || "",
                    warehouseId: log.warehouse_id || null,
                    warehouseName: log.warehouse_name || "",
                    imageUrls: images,
                  };
                })
              );

              return {
                id: set.id.toString(),
                packingCode: set.packing_code || "",
                date: formatDateForInput(set.packing_date),
                packageInfoList: packageInfoList,
                logisticsInfoList: logisticsInfoList,
              };
            })
          );

          console.log('[usePurchaseOrderData] 변환된 delivery sets:', setsWithImages);
          console.log('[usePurchaseOrderData] 변환된 delivery sets 길이:', setsWithImages.length);
          setDeliverySets(setsWithImages);
          console.log('[usePurchaseOrderData] setDeliverySets 호출 완료');
        } else {
          console.warn('[usePurchaseOrderData] result.success가 false이거나 result.data가 없음');
          setDeliverySets([]);
        }
      } else {
        const errorText = await response.text().catch(() => '');
        console.error('[usePurchaseOrderData] delivery sets 조회 실패 - 응답 본문:', errorText);
        setDeliverySets([]);
      }
    } catch (err) {
      console.error('[usePurchaseOrderData] 배송 세트 로드 오류:', err);
      if (err instanceof Error) {
        console.error('[usePurchaseOrderData] 에러 메시지:', err.message);
        console.error('[usePurchaseOrderData] 에러 스택:', err.stack);
      }
      setDeliverySets([]);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      loadDeliverySets();
    }
  }, [order, loadDeliverySets]);

  // 발주 데이터 재로드 함수
  const reloadPurchaseOrder = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}/purchase-orders/${orderId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const po = data.data;
        
        // 서버 응답을 클라이언트 형식으로 변환
        const convertedOrder: PurchaseOrder = {
          id: po.id,
          poNumber: po.po_number,
          supplier: po.supplier?.name || '',
          product: po.product?.name || po.product_name || '',
          productImage: po.product_main_image 
            ? (po.product_main_image.startsWith('http') ? po.product_main_image : `${SERVER_BASE_URL}${po.product_main_image}`)
            : (po.product?.main_image ? (po.product.main_image.startsWith('http') ? po.product.main_image : `${SERVER_BASE_URL}${po.product.main_image}`) : undefined),
          unitPrice: po.unit_price,
          optionCost: 0,
          quantity: po.quantity,
          size: po.size || '',
          weight: po.weight || '',
          packaging: po.packaging || 0,
          factoryStatus: '출고대기',
          workStatus: '작업대기',
          deliveryStatus: po.delivery_status || '대기중',
          paymentStatus: po.payment_status || '미결제',
          date: formatDateForInput(po.order_date),
          estimatedDelivery: formatDateForInput(po.estimated_delivery),
          notes: '',
          supplierContact: '',
          supplierAddress: '',
          _rawData: po,
        };
        
        setOrder(convertedOrder);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('발주 정보 재로드 오류:', err);
      setIsLoading(false);
    }
  }, [orderId, API_BASE_URL, SERVER_BASE_URL]);

  return {
    order,
    isLoading,
    optionItems,
    laborCostItems,
    factoryShipments,
    returnExchangeItems,
    workItems,
    deliverySets,
    setOptionItems,
    setLaborCostItems,
    setFactoryShipments,
    setReturnExchangeItems,
    setWorkItems,
    setDeliverySets,
    reloadCostItems: loadCostItems,
    reloadFactoryShipments: loadFactoryShipments,
    reloadReturnExchanges: loadReturnExchanges,
    reloadWorkItems: loadWorkItems,
    reloadDeliverySets: loadDeliverySets,
    reloadPurchaseOrder,
  };
}

