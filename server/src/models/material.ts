// 부자재 타입 정의

export type MaterialImageType = 'product' | 'test';

export interface Material {
  id: number;
  code: string;
  date: Date;
  productName: string;
  productNameChinese: string | null;
  category: string;
  typeCount: number;
  link: string | null;
  price: number | null;
  purchaseComplete: boolean;
  currentStock: number;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

// 클라이언트에 전달할 때 이미지 정보 포함
export interface MaterialPublic extends Material {
  images?: {
    product: string[];
    test: string[];
  };
}

// 부자재 생성 시 사용하는 DTO
export interface CreateMaterialDTO {
  code: string;
  date: Date;
  productName: string;
  productNameChinese?: string;
  category: string;
  typeCount: number;
  link?: string;
  price?: number;
  purchaseComplete?: boolean;
  currentStock?: number;
  created_by?: string;
}

// 부자재 수정 시 사용하는 DTO
export interface UpdateMaterialDTO {
  date?: Date;
  productName?: string;
  productNameChinese?: string;
  category?: string;
  typeCount?: number;
  link?: string;
  price?: number;
  purchaseComplete?: boolean;
  currentStock?: number;
  updated_by?: string;
}

// 입출고 기록 타입 정의
export interface MaterialInventoryTransaction {
  id: number;
  materialId: number;
  transactionDate: Date;
  transactionType: 'in' | 'out';
  quantity: number;
  relatedOrder: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
}

// 입출고 기록 생성 DTO
export interface CreateInventoryTransactionDTO {
  transactionDate: Date;
  transactionType: 'in' | 'out';
  quantity: number;
  relatedOrder?: string;
  notes?: string;
  created_by?: string;
}

// 테스트 이미지 메타데이터 타입 정의
export interface MaterialTestImageMetadata {
  id: number;
  materialId: number;
  imageUrl: string;
  reaction: 'like' | 'dislike' | null;
  memo: string | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  updatedAt: Date;
}

// 테스트 이미지 메타데이터 업데이트 DTO
export interface UpdateTestImageMetadataDTO {
  reaction?: 'like' | 'dislike' | null;
  memo?: string | null;
  confirmed?: boolean; // true면 확인 처리, false면 확인 취소
  confirmedBy?: string; // 확인 처리 시 관리자 이름
}

