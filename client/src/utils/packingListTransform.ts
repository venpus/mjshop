// 서버 API 데이터와 클라이언트 데이터 간 변환 함수

import type { PackingListItem } from '../components/packing-list/types';
import type {
  PackingListWithItems,
  PackingListItem as ServerPackingListItem,
  DomesticInvoice as ServerDomesticInvoice,
  KoreaArrival as ServerKoreaArrival,
  CreatePackingListRequest,
  CreatePackingListItemRequest,
} from '../api/packingListApi';
import type { PackingListFormData, ProductGroup } from '../components/PackingListCreateModal';
import type { FactoryShipment } from '../components/tabs/FactoryShippingTab';

const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * 서버 이미지 URL을 전체 URL로 변환
 */
function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${SERVER_BASE_URL}${imageUrl}`;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환 (년 월 일만 표시)
 */
function formatDateOnly(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  
  // Date 객체인 경우 문자열로 변환
  let dateString = typeof dateStr === 'string' ? dateStr : dateStr.toString();
  
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // ISO 문자열이나 다른 형식이면 YYYY-MM-DD로 변환
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 서버 데이터를 클라이언트 PackingListItem[]로 변환
 */
export function transformServerToClient(
  serverData: PackingListWithItems[]
): PackingListItem[] {
  const clientItems: PackingListItem[] = [];

  serverData.forEach((packingList) => {
    if (!packingList.items || packingList.items.length === 0) {
      // 아이템이 없는 경우도 하나의 행으로 표시 (빈 행)
      clientItems.push({
        id: `${packingList.id}-0`,
        date: formatDateOnly(packingList.shipment_date),
        code: packingList.code,
        productName: '',
        purchaseOrderId: undefined,
        productImage: '',
        entryQuantity: '',
        boxCount: '',
        unit: '박스',
        totalQuantity: 0,
        domesticInvoice: [],
        logisticsCompany: packingList.logistics_company || '',
        warehouseArrivalDate: packingList.warehouse_arrival_date ? formatDateOnly(packingList.warehouse_arrival_date) : '',
        koreaArrivalDate: [],
        actualWeight: packingList.actual_weight?.toString() || '',
        weightRatio: (() => {
          const ratio = packingList.weight_ratio;
          console.log('[비율 로드] 서버에서 받은 weight_ratio:', ratio, 'packingListId:', packingList.id);
          if (ratio === null || ratio === undefined) {
            console.log('[비율 로드] null/undefined → 빈 문자열 반환');
            return '';
          }
          // 숫자를 정수로 변환 후 퍼센트 문자열로 변환 (5.00 -> 5 -> "5%", 10.00 -> 10 -> "10%", 등)
          const ratioInt = Math.round(parseFloat(String(ratio)));
          const ratioStr = `${ratioInt}%`;
          console.log('[비율 로드] 변환:', ratio, '→', ratioInt, '→', ratioStr);
          // 타입 안전성을 위해 유효한 비율 값인지 확인
          if (ratioStr === '5%' || ratioStr === '10%' || ratioStr === '15%' || ratioStr === '20%') {
            console.log('[비율 로드] 유효한 비율 값:', ratioStr);
            return ratioStr as PackingListItem['weightRatio'];
          }
          console.log('[비율 로드] 유효하지 않은 비율 값:', ratioStr, '→ 빈 문자열 반환');
          return '';
        })(),
        calculatedWeight: packingList.calculated_weight?.toString() || '',
        shippingCost: packingList.shipping_cost?.toString() || '',
        paymentDate: packingList.payment_date ? formatDateOnly(packingList.payment_date) : '',
        wkPaymentDate: packingList.wk_payment_date ? formatDateOnly(packingList.wk_payment_date) : '',
        rowspan: undefined,
        isFirstRow: true,
      });
      return;
    }

    packingList.items.forEach((item, index) => {
      // 내륙송장 데이터 변환
      const domesticInvoices = item.domestic_invoices || [];
      const transformedInvoices = domesticInvoices.map((invoice: ServerDomesticInvoice) => ({
        id: invoice.id,
        number: invoice.invoice_number,
        images: (invoice.images || []).map((img) => ({
          id: img.id,
          url: getFullImageUrl(img.image_url),
        })),
      }));

      // 한국도착일 데이터 변환
      const koreaArrivals = item.korea_arrivals || [];
      const transformedKoreaArrivals = koreaArrivals.map((arrival: ServerKoreaArrival) => ({
        id: arrival.id,
        date: arrival.arrival_date ? formatDateOnly(arrival.arrival_date) : '',
        quantity: arrival.quantity.toString(),
      }));

      const isMultipleProducts = packingList.items!.length > 1;
      const isFirstRow = index === 0;

      clientItems.push({
        id: `${packingList.id}-${item.id}`,
        date: formatDateOnly(packingList.shipment_date),
        code: packingList.code,
        productName: item.product_name,
        purchaseOrderId: item.purchase_order_id || undefined,
        productImage: getFullImageUrl(item.product_image_url),
        entryQuantity: item.entry_quantity || '',
        boxCount: item.box_count.toString(),
        unit: item.unit,
        totalQuantity: item.total_quantity,
        domesticInvoice: transformedInvoices,
        logisticsCompany: packingList.logistics_company || '',
        warehouseArrivalDate: packingList.warehouse_arrival_date ? formatDateOnly(packingList.warehouse_arrival_date) : '',
        koreaArrivalDate: transformedKoreaArrivals,
        actualWeight: packingList.actual_weight?.toString() || '',
        weightRatio: (() => {
          const ratio = packingList.weight_ratio;
          console.log('[비율 로드] 서버에서 받은 weight_ratio:', ratio, 'packingListId:', packingList.id);
          if (ratio === null || ratio === undefined) {
            console.log('[비율 로드] null/undefined → 빈 문자열 반환');
            return '';
          }
          // 숫자를 정수로 변환 후 퍼센트 문자열로 변환 (5.00 -> 5 -> "5%", 10.00 -> 10 -> "10%", 등)
          const ratioInt = Math.round(parseFloat(String(ratio)));
          const ratioStr = `${ratioInt}%`;
          console.log('[비율 로드] 변환:', ratio, '→', ratioInt, '→', ratioStr);
          // 타입 안전성을 위해 유효한 비율 값인지 확인
          if (ratioStr === '5%' || ratioStr === '10%' || ratioStr === '15%' || ratioStr === '20%') {
            console.log('[비율 로드] 유효한 비율 값:', ratioStr);
            return ratioStr as PackingListItem['weightRatio'];
          }
          console.log('[비율 로드] 유효하지 않은 비율 값:', ratioStr, '→ 빈 문자열 반환');
          return '';
        })(),
        calculatedWeight: packingList.calculated_weight?.toString() || '',
        shippingCost: packingList.shipping_cost?.toString() || '',
        paymentDate: packingList.payment_date ? formatDateOnly(packingList.payment_date) : '',
        wkPaymentDate: packingList.wk_payment_date ? formatDateOnly(packingList.wk_payment_date) : '',
        rowspan: isMultipleProducts && isFirstRow ? packingList.items!.length : undefined,
        isFirstRow,
      });
    });
  });

  return clientItems;
}

/**
 * PackingListFormData를 서버 API CreatePackingListRequest 형식으로 변환
 */
export function transformFormDataToServerRequest(
  formData: PackingListFormData,
  items: CreatePackingListItemRequest[]
): { packingList: CreatePackingListRequest; items: CreatePackingListItemRequest[] } {
  // 중량 계산
  let actualWeight: number | undefined;
  let weightRatio: number | undefined;
  let calculatedWeight: number | undefined;

  if (formData.weight) {
    const weightStr = formData.weight.trim();
    let weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, '')) || 0;

    if (weightStr.toLowerCase().includes('g') && !weightStr.toLowerCase().includes('kg')) {
      weightNum = weightNum / 1000; // g를 kg로 변환
    }

    actualWeight = weightNum;

    // 비율과 계산 중량은 나중에 클라이언트에서 입력될 수 있으므로 여기서는 undefined로 설정
    // 필요시 추가 로직 구현
  }

  const packingList: CreatePackingListRequest = {
    code: formData.code,
    shipment_date: formData.date,
    logistics_company: formData.logisticsCompany || undefined,
    warehouse_arrival_date: formData.warehouseArrivalDate || undefined, // 물류창고 도착일 추가
    actual_weight: actualWeight,
    weight_ratio: weightRatio,
    calculated_weight: calculatedWeight,
  };

  return { packingList, items };
}

/**
 * PackingListFormData의 products를 CreatePackingListItemRequest[]로 변환
 */
export function transformFormDataProductsToItems(
  formData: PackingListFormData
): CreatePackingListItemRequest[] {
  return formData.products.map((product) => {
    const kindNum = parseFloat(product.kind) || 0;
    const quantityNum = parseFloat(product.quantity) || 0;
    const setNum = parseFloat(product.set) || 0;
    const entryQuantity = `${kindNum}종 x ${quantityNum}개 x ${setNum}세트`;
    
    const boxCount = parseFloat(formData.boxCount) || 0;
    const totalQuantity = product.total * boxCount;

    return {
      purchase_order_id: product.purchaseOrderId || null,
      product_name: product.productName,
      product_image_url: product.productImageUrl || undefined,
      entry_quantity: entryQuantity,
      box_count: boxCount,
      unit: formData.boxType,
      total_quantity: totalQuantity,
      is_factory_to_warehouse: formData.isFactoryToWarehouse || false, // 공장→물류창고 플래그 전달
    };
  });
}

/**
 * FactoryShipment 배열을 PackingListFormData로 변환
 */
export function convertFactoryShipmentsToFormData(
  factoryShipments: FactoryShipment[],
  orderId: string,
  orderProductName: string,
  orderProductImageUrl: string | null | undefined,
  orderDate?: string
): PackingListFormData {
  // 오늘 날짜를 기본값으로 사용
  const todayDate = new Date().toISOString().split('T')[0];
  const defaultDate = orderDate || todayDate;

  let products: ProductGroup[] = [];
  let firstShipmentDate = defaultDate;

  // 출고 항목이 있는 경우 그룹화하여 처리
  if (factoryShipments.length > 0) {
    // 첫 번째 shipment의 날짜 사용
    firstShipmentDate = factoryShipments[0].date || defaultDate;
    
    // 같은 날짜의 shipment들을 그룹화하여 수량 합산
    const shipmentGroups = new Map<string, number>();
    factoryShipments.forEach((shipment) => {
      const date = shipment.date || firstShipmentDate;
      const currentQuantity = shipmentGroups.get(date) || 0;
      shipmentGroups.set(date, currentQuantity + shipment.quantity);
    });

    // ProductGroup 배열 생성
    products = Array.from(shipmentGroups.entries()).map(([date, totalQuantity], index) => {
      // 기본값 설정: kind=1, quantity=totalQuantity, set=1
      // 이렇게 설정하면 total = kind × quantity × set = 1 × totalQuantity × 1 = totalQuantity가 됩니다.
      // 주의: 사용자가 kind나 set를 변경하면 PackingListCreateModal의 calculateTotal 함수에 의해
      // total이 자동으로 재계산됩니다. 따라서 사용자는 quantity, kind, set 값을 확인하고
      // 필요시 수정하여 total이 totalQuantity와 일치하도록 해야 합니다.
      return {
        id: `factory-shipment-${index}-${Date.now()}`,
        productName: orderProductName,
        purchaseOrderId: orderId,
        productImageUrl: orderProductImageUrl || undefined,
        boxCount: '',
        boxType: '박스',
        weight: '',
        kind: '1', // 기본값, 사용자 입력 필요
        quantity: totalQuantity.toString(), // 기본값 (totalQuantity와 동일하게 설정하여 초기 total = totalQuantity 유지)
        set: '1', // 기본값, 사용자 입력 필요
        total: totalQuantity, // 기본값 (kind × quantity × set = totalQuantity가 되도록 설정)
      };
    });
  } else {
    // 출고 항목이 없는 경우 기본 제품 그룹 생성 (사용자가 수량을 입력할 수 있도록)
    products = [{
      id: `factory-shipment-0-${Date.now()}`,
      productName: orderProductName,
      purchaseOrderId: orderId,
      productImageUrl: orderProductImageUrl || undefined,
      boxCount: '',
      boxType: '박스',
      weight: '',
      kind: '1',
      quantity: '', // 사용자가 입력할 수 있도록 빈 값
      set: '1',
      total: 0, // 사용자가 입력할 수 있도록 0으로 설정
    }];
  }

  return {
    date: firstShipmentDate,
    code: '',
    logisticsCompany: '',
    products,
    weight: '',
    weightType: '개별 중량',
    boxCount: '',
    boxType: '박스',
    isFactoryToWarehouse: true, // 공장→물류창고 플래그 설정
    warehouseArrivalDate: firstShipmentDate, // 물류창고 도착일 = 출고일 (입고와 출고가 동시에 이루어짐)
  };
}

/**
 * 클라이언트 PackingListItem을 서버 API 형식으로 변환하는 헬퍼 함수
 * (현재는 주로 코드 그룹 기준으로 변환)
 */
export function getPackingListIdFromCode(
  clientItems: PackingListItem[],
  code: string
): number | null {
  if (clientItems.length === 0) return null;

  // id에서 packing_list_id 추출 (형식: "packingListId-itemId")
  const firstItem = clientItems.find((item) => item.code === code);
  if (!firstItem) return null;

  const parts = firstItem.id.split('-');
  const packingListId = parseInt(parts[0]);
  return isNaN(packingListId) ? null : packingListId;
}
