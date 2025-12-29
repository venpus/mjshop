// 패킹리스트 타입 정의

export interface DomesticInvoiceImageInfo {
  id?: number; // 서버 이미지 ID (로컬에서 생성한 경우 undefined)
  url: string; // 이미지 URL
}

export interface DomesticInvoice {
  id?: number; // 서버 ID (클라이언트에서 생성한 경우 undefined)
  number: string; // 송장번호
  images: DomesticInvoiceImageInfo[]; // 송장 사진 정보 배열 (최대 10장)
  pendingImages?: File[]; // 업로드 대기 중인 파일들 (임시)
}

export interface PackingListItem {
  id: string;
  date: string; // 발송일
  code: string; // 코드
  productName: string; // 제품명
  purchaseOrderId?: string; // 발주 ID (제품명 클릭 시 발주 상세로 이동하기 위해 필요)
  productImage: string; // 제품사진 (URL)
  entryQuantity: string; // 입수량
  boxCount: string; // 박스수
  unit: '박스' | '마대'; // 단위
  totalQuantity: number; // 총수량
  domesticInvoice: DomesticInvoice[]; // 내륙송장 (여러개 입력 가능, 각각 송장번호와 사진 포함)
  logisticsCompany: string; // 물류회사
  warehouseArrivalDate: string; // 물류창고 도착일
  koreaArrivalDate: Array<{ id?: number; date: string; quantity: string }>; // 한국도착일 (날짜와 수량을 여러개 입력 가능, id는 서버 ID)
  actualWeight: string; // 실중량
  weightRatio: '0%' | '5%' | '10%' | '15%' | '20%' | ''; // 비율
  calculatedWeight: string; // 중량 (실중량 x (1+비율))
  shippingCost: string; // 배송비
  paymentDate: string; // 지급일
  wkPaymentDate: string; // WK결제일
  rowspan?: number; // 병합할 행 수 (제품이 여러 개일 때)
  isFirstRow?: boolean; // 첫 번째 행인지 여부
}

// 상수
export const LOGISTICS_COMPANIES = ['위해-한사장', '광저우-비전', '위해-비전', '정상해운'] as const;
export const WEIGHT_RATIOS: Array<'0%' | '5%' | '10%' | '15%' | '20%'> = ['0%', '5%', '10%', '15%', '20%'];
