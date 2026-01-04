import type { PackingListItem } from '../components/packing-list/types';
import type { PackingListFormData, ProductGroup } from '../components/PackingListCreateModal';

/**
 * 실중량과 비율로 중량 계산 (숫자만 반환)
 */
export function calculateWeight(actualWeight: string, weightRatio: string): string {
  if (!actualWeight || !weightRatio) return '';
  const weightNum = parseFloat(actualWeight.replace(/[^0-9.]/g, '')) || 0;
  const ratioNum = parseFloat(weightRatio.replace('%', '')) || 0;
  const calculated = weightNum * (1 + ratioNum / 100);
  // 최대 4자리 숫자까지 표기 (소수점 포함)
  const formatted = calculated.toFixed(2);
  return formatted;
}

/**
 * 물류회사와 중량을 기반으로 배송비 계산
 * @param logisticsCompany 물류회사 ('위해-한사장', '광저우-비전', '위해-비전', '정상해운')
 * @param calculatedWeight 계산된 중량 (우선 사용)
 * @param actualWeight 실중량 (calculatedWeight가 없을 때 사용)
 * @returns 계산된 배송비 (문자열, 소수점 두자리)
 */
export function calculateShippingCostByLogisticsCompany(
  logisticsCompany: string,
  calculatedWeight: string,
  actualWeight: string
): string {
  // 정상해운은 항상 0
  if (logisticsCompany === '정상해운') {
    return '0';
  }

  // 물류회사가 없으면 계산하지 않음
  if (!logisticsCompany || logisticsCompany === '') {
    return '';
  }

  // 중량 우선순위: calculatedWeight > actualWeight
  const weightStr = calculatedWeight || actualWeight;
  if (!weightStr) {
    return '';
  }

  // 중량 숫자 추출
  const weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, '')) || 0;
  if (weightNum <= 0) {
    return '';
  }

  // 물류회사별 배송비 계산
  let shippingCost = 0;
  switch (logisticsCompany) {
    case '위해-한사장':
      shippingCost = weightNum * 30;
      break;
    case '광저우-비전':
      shippingCost = weightNum * 29.8; // 29 + 0.8
      break;
    case '위해-비전':
      shippingCost = weightNum * 29;
      break;
    default:
      return '';
  }

  // 소수점 두자리까지 반환
  return shippingCost.toFixed(2);
}

/**
 * PackingListItem을 PackingListFormData로 변환하는 함수
 */
export function convertItemToFormData(items: PackingListItem[]): PackingListFormData | null {
  if (items.length === 0) return null;

  const firstItem = items[0];

  // entryQuantity에서 kind, quantity, set 추출 (예: "2종 x 5개 x 3세트")
  const parseEntryQuantity = (entryQuantity: string) => {
    const match = entryQuantity.match(/(\d+)종\s*x\s*(\d+)개\s*x\s*(\d+)세트/);
    if (match) {
      return {
        kind: match[1],
        quantity: match[2],
        set: match[3],
      };
    }
    return { kind: '', quantity: '', set: '' };
  };

  // products 배열 생성
  const products: ProductGroup[] = items.map((item, index) => {
    const parsed = parseEntryQuantity(item.entryQuantity);
    // 총수량에서 박스수로 나누어 입수량 결과만 추출
    const boxCountNum = parseFloat(item.boxCount) || 1; // 박스수가 0이면 1로 처리 (0으로 나누기 방지)
    const entryQuantityResult = boxCountNum > 0 ? item.totalQuantity / boxCountNum : item.totalQuantity;
    
    return {
      id: `product-${index}`,
      productName: item.productName,
      purchaseOrderId: item.purchaseOrderId, // 발주 ID 복원
      productImageUrl: item.productImage || undefined, // 제품 이미지 URL 복원
      boxCount: index === 0 ? item.boxCount : '', // 첫 번째 아이템의 boxCount 사용
      boxType: index === 0 ? item.unit : '박스', // 첫 번째 아이템의 unit 사용
      weight: '', // 제품별 중량은 모달에서 관리하지 않음
      kind: parsed.kind,
      quantity: parsed.quantity,
      set: parsed.set,
      total: entryQuantityResult, // 입수량 결과 (총수량 / 박스수)
    };
  });

  // 중량 타입 결정: 제품이 1개이고 개별 중량인지 확인
  // 실제로는 actualWeight를 보고 판단 (개별 중량 x 박스수 형식인지 확인)
  let weightType: '개별 중량' | '합산 중량' = '합산 중량';
  if (items.length === 1 && firstItem.actualWeight) {
    // 개별 중량 x 박스수로 계산되었는지 확인 (복잡하므로 기본값으로 설정)
    weightType = '개별 중량';
  }

  // 중량에서 숫자만 추출 (단위 제거)
  const weightValue = firstItem.actualWeight.replace(/[^0-9.]/g, '') || '';

  return {
    date: firstItem.date,
    code: firstItem.code,
    logisticsCompany: firstItem.logisticsCompany,
    products,
    weight: weightValue,
    weightType,
    boxCount: firstItem.boxCount,
    boxType: firstItem.unit,
  };
}

/**
 * 그룹 ID 추출 (item.id에서 첫 번째 부분)
 */
export function getGroupId(itemId: string): string {
  return itemId.split('-')[0];
}

/**
 * PackingListFormData로부터 PackingListItem 배열 생성
 */
export function createItemsFromFormData(data: PackingListFormData, groupId: string): PackingListItem[] {
  const isMultipleProducts = data.products.length > 1;

  return data.products.map((product, index) => {
    const kindNum = parseFloat(product.kind) || 0;
    const quantityNum = parseFloat(product.quantity) || 0;
    const setNum = parseFloat(product.set) || 0;
    const entryQuantityFormat = `${kindNum}종 x ${quantityNum}개 x ${setNum}세트`;
    
    const boxCountNum = parseFloat(data.boxCount) || 0;
    const totalQuantityValue = product.total * boxCountNum;

    // 중량 계산 (소수점 두자리까지)
    let weightValue: string = '';
    if (data.products.length === 1 && data.weightType === '개별 중량') {
      // 개별 중량: 개별 중량 x 박스수 (소수점 두자리까지)
      const weightStr = data.weight.trim();
      let weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, '')) || 0;
      
      if (weightStr.toLowerCase().includes('g') && !weightStr.toLowerCase().includes('kg')) {
        weightNum = weightNum / 1000;
      }
      
      const calculatedWeight = parseFloat((weightNum * boxCountNum).toFixed(2));
      weightValue = calculatedWeight.toString();
    } else if (data.weight) {
      // 합산 중량: 입력한 값 그대로 (소수점 두자리까지)
      const weightStr = data.weight.trim();
      let weightNum = parseFloat(weightStr.replace(/[^0-9.]/g, '')) || 0;
      
      if (weightStr.toLowerCase().includes('g') && !weightStr.toLowerCase().includes('kg')) {
        weightNum = weightNum / 1000;
      }
      
      weightValue = parseFloat(weightNum.toFixed(2)).toString();
    }

    return {
      id: `${groupId}-${index}`,
      date: data.date,
      code: data.code,
      productName: product.productName,
      purchaseOrderId: undefined,
      productImage: '',
      entryQuantity: entryQuantityFormat,
      boxCount: data.boxCount,
      unit: data.boxType,
      totalQuantity: totalQuantityValue,
      domesticInvoice: [],
      logisticsCompany: data.logisticsCompany,
      warehouseArrivalDate: '',
      koreaArrivalDate: [],
      actualWeight: weightValue,
      weightRatio: '',
      calculatedWeight: '',
      shippingCost: '',
      paymentDate: '',
      wkPaymentDate: '',
      rowspan: isMultipleProducts && index === 0 ? data.products.length : undefined,
      isFirstRow: index === 0,
    };
  });
}