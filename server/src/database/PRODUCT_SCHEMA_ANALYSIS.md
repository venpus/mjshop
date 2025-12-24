# 상품(Products) 테이블 데이터셋 분석

## 1. Product 인터페이스 분석

클라이언트 `Products.tsx`의 Product 인터페이스를 기반으로 분석:

```typescript
interface Product {
  id: string;                    // 상품 ID (예: "P001")
  name: string;                  // 상품명 (한국어)
  nameChinese?: string;          // 상품명 (중국어, 선택적)
  category: string;              // 카테고리 (예: "봉제", "키링", "피규어", "잡화")
  price: number;                 // 가격 (원)
  stock: number;                 // 재고 수량
  status: "판매중" | "품절" | "숨김";  // 판매 상태
  size: string;                  // 상품 크기 (예: "5x3x2")
  packagingSize: string;         // 포장 크기 (예: "10x8x6")
  weight: string;                // 무게 (예: "50", "1.2g", "600")
  setCount: number;              // 세트 수량
  smallPackCount: number;        // 소포장 개수
  boxCount: number;              // 박스당 개수
  mainImage: string;             // 메인 이미지 URL/경로
  images: string[];              // 이미지 배열 (다중 이미지)
  supplier: {                    // 공급업체 정보
    name: string;                // 공급업체명
    url: string;                 // 공급업체 URL
  };
}
```

## 2. 필요한 데이터베이스 테이블 구조

### 2.1. products 테이블 (메인 상품 테이블)

```sql
CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY COMMENT '상품 ID',
  name VARCHAR(255) NOT NULL COMMENT '상품명 (한국어)',
  name_chinese VARCHAR(255) NULL COMMENT '상품명 (중국어)',
  category VARCHAR(50) NOT NULL COMMENT '카테고리 (봉제, 키링, 피규어, 잡화)',
  price DECIMAL(10, 2) NOT NULL COMMENT '가격 (원)',
  stock INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
  status ENUM('판매중', '품절', '숨김') NOT NULL DEFAULT '판매중' COMMENT '판매 상태',
  size VARCHAR(100) NULL COMMENT '상품 크기',
  packaging_size VARCHAR(100) NULL COMMENT '포장 크기',
  weight VARCHAR(50) NULL COMMENT '무게',
  set_count INT NOT NULL DEFAULT 1 COMMENT '세트 수량',
  small_pack_count INT NOT NULL DEFAULT 1 COMMENT '소포장 개수',
  box_count INT NOT NULL DEFAULT 1 COMMENT '박스당 개수',
  main_image VARCHAR(500) NULL COMMENT '메인 이미지 URL/경로',
  supplier_id INT NULL COMMENT '공급업체 ID (FK)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 테이블';
```

### 2.2. product_images 테이블 (상품 이미지 테이블)

```sql
CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  product_id VARCHAR(50) NOT NULL COMMENT '상품 ID (FK)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 URL/경로',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상품 이미지 테이블';
```

### 2.3. suppliers 테이블 (공급업체 테이블)

```sql
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공급업체 ID',
  name VARCHAR(255) NOT NULL COMMENT '공급업체명',
  url VARCHAR(500) NULL COMMENT '공급업체 URL',
  contact_person VARCHAR(100) NULL COMMENT '담당자명',
  contact_phone VARCHAR(20) NULL COMMENT '담당자 연락처',
  contact_email VARCHAR(255) NULL COMMENT '담당자 이메일',
  address TEXT NULL COMMENT '주소',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공급업체 테이블';
```

## 3. 필드별 상세 분석

### 3.1. 필수 필드 (NOT NULL)
- `id`: 상품 고유 식별자
- `name`: 상품명 (한국어)
- `category`: 카테고리
- `price`: 가격
- `stock`: 재고 수량
- `status`: 판매 상태

### 3.2. 선택 필드 (NULL 가능)
- `name_chinese`: 중국어 상품명
- `size`: 상품 크기
- `packaging_size`: 포장 크기
- `weight`: 무게 (단위 포함 가능)
- `main_image`: 메인 이미지
- `supplier_id`: 공급업체 ID

### 3.3. 기본값 필드
- `set_count`: 기본값 1
- `small_pack_count`: 기본값 1
- `box_count`: 기본값 1
- `status`: 기본값 '판매중'
- `stock`: 기본값 0

## 4. 관계(Relationships)

- **products ↔ suppliers**: Many-to-One
  - 하나의 상품은 하나의 공급업체에 속함
  - 하나의 공급업체는 여러 상품을 가질 수 있음
  
- **products ↔ product_images**: One-to-Many
  - 하나의 상품은 여러 이미지를 가질 수 있음
  - 이미지는 하나의 상품에만 속함

## 5. 추가 고려사항

### 5.1. 카테고리 관리
- 카테고리는 ENUM 또는 별도 테이블로 관리 가능
- 현재: "봉제", "키링", "피규어", "잡화"
- 향후 확장 가능성을 고려하여 별도 테이블 고려 권장

### 5.2. 이미지 관리
- 이미지는 별도 테이블로 분리하여 다중 이미지 지원
- `main_image`는 products 테이블에 저장 (빠른 조회용)
- `product_images` 테이블에 모든 이미지 저장
- `display_order`로 이미지 순서 관리

### 5.3. 재고 관리
- `stock`은 현재 재고 수량
- 향후 재고 변동 이력을 위한 별도 테이블 고려 권장

### 5.4. 공급업체 관리
- 공급업체는 별도 테이블로 분리하여 중복 제거 및 관리 용이성 확보

## 6. 샘플 데이터 예시

```sql
-- 공급업체 데이터
INSERT INTO suppliers (name, url) VALUES
('Supplier A', 'https://www.suppliera.com'),
('Supplier B', 'https://www.supplierb.com');

-- 상품 데이터
INSERT INTO products (id, name, category, price, stock, status, size, packaging_size, weight, set_count, small_pack_count, box_count, main_image, supplier_id) VALUES
('P001', '테디베어 봉제인형', '봉제', 89000, 45, '판매중', '5x3x2', '10x8x6', '50', 1, 10, 100, 'https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400', 1);

-- 상품 이미지 데이터
INSERT INTO product_images (product_id, image_url, display_order) VALUES
('P001', 'https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400', 0),
('P001', 'https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400', 1),
('P001', 'https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400', 2);
```

## 7. 마이그레이션 파일 생성 순서

1. `suppliers` 테이블 생성
2. `products` 테이블 생성
3. `product_images` 테이블 생성

