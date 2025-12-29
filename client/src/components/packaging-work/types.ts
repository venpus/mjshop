/**
 * 포장자재 타입 정의
 */
export interface PackagingMaterial {
  id: number; // 번호
  code: string; // 코드
  name: string; // 포장자재명
  nameChinese: string; // 중문명
  price: number; // 단가
  stock: number; // 재고
  images: string[]; // 사진썸네일
}

