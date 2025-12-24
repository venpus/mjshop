# 이미지 저장 폴더 구조 분석: 상품코드별 폴더 분리

## 요구사항

이미지를 상품코드별 폴더에 저장하는 구조:
```
uploads/products/
├── P001/
│   ├── 001.jpg  (메인 이미지)
│   ├── 002.jpg  (추가 이미지 1)
│   └── 003.jpg  (추가 이미지 2)
├── P002/
│   ├── 001.jpg  (메인 이미지)
│   └── 002.jpg  (추가 이미지 1)
└── P003/
    ├── 001.jpg
    └── 002.jpg
```

## 현재 구현 방식

### 현재 폴더 구조
```
uploads/products/
├── teddybear-1234567890-987654321.jpg
├── teddybear-detail1-1234567891-123456789.jpg
├── panda-1234567892-234567890.jpg
└── ...
```

**특징:**
- 모든 상품의 이미지가 같은 폴더에 저장
- 파일명으로만 구분

## 새로운 구조 제안

### 폴더 구조
```
uploads/products/
├── P001/          (상품 P001 전용 폴더)
│   ├── 001.jpg    (메인 이미지)
│   ├── 002.jpg    (추가 이미지 1)
│   ├── 003.jpg    (추가 이미지 2)
│   └── ...
├── P002/          (상품 P002 전용 폴더)
│   ├── 001.jpg
│   └── 002.jpg
└── P003/
    └── 001.jpg
```

### 파일명 규칙
- **폴더명**: 상품코드 (예: `P001`, `P002`)
- **파일명**: 순차 번호 (예: `001.jpg`, `002.jpg`, `003.jpg`)
- **전체 경로**: `uploads/products/P001/001.jpg`

### DB 저장 형식
```sql
-- products 테이블
main_image = '/uploads/products/P001/001.jpg'

-- product_images 테이블
product_id | image_url                          | display_order
-----------|------------------------------------|--------------
P001       | /uploads/products/P001/001.jpg     | 0
P001       | /uploads/products/P001/002.jpg     | 1
P001       | /uploads/products/P001/003.jpg     | 2
```

## 구현 가능성 분석

### ✅ 완전히 가능

상품코드별 폴더 구조는 구현 가능하며, 여러 장점이 있습니다.

## 구현 방법

### 방법 1: 상품 생성 시 폴더 생성 (권장)

#### 구현 흐름

1. **Multer 설정**: 임시 파일을 메인 폴더에 저장
2. **상품 ID 생성**: 상품 저장 후 상품코드 획득
3. **상품코드 폴더 생성**: `uploads/products/P001/` 폴더 생성
4. **파일 이동**: 임시 파일을 상품코드 폴더로 이동 및 파일명 변경
5. **DB 저장**: 새 경로를 DB에 저장

#### 구현 코드 예시

```typescript
// upload.ts - 폴더별 저장을 위한 함수 추가
import fs from 'fs/promises';
import path from 'path';

/**
 * 상품코드별 폴더 경로 생성
 */
export function getProductImageDir(productId: string): string {
  return path.join(uploadDir, productId);
}

/**
 * 상품코드 폴더 생성
 */
export async function createProductImageDir(productId: string): Promise<void> {
  const productDir = getProductImageDir(productId);
  await fs.mkdir(productDir, { recursive: true });
}

/**
 * 파일을 상품코드 폴더로 이동 및 파일명 변경
 */
export async function moveImageToProductFolder(
  tempFilePath: string,
  productId: string,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  // 1. 상품코드 폴더 생성
  await createProductImageDir(productId);
  
  // 2. 새 파일명 생성: 001.jpg, 002.jpg 형식
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const productDir = getProductImageDir(productId);
  const newFilePath = path.join(productDir, newFilename);
  
  // 3. 파일 이동 및 이름 변경
  await fs.rename(tempFilePath, newFilePath);
  
  // 4. 상대 경로 반환 (URL 생성용)
  return `products/${productId}/${newFilename}`;
}

/**
 * 이미지 URL 생성 (폴더 구조 포함)
 */
export function getImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}
```

#### Controller 수정

```typescript
// productController.ts
import { 
  getProductImageDir, 
  createProductImageDir, 
  moveImageToProductFolder,
  getImageUrl 
} from '../utils/upload.js';

createProduct = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const mainImageFile = files.find((f) => f.fieldname === 'mainImage');
    const infoImageFiles = files.filter((f) => f.fieldname === 'infoImages');

    // 1. 상품 생성 (상품 ID 획득)
    const product = await this.service.createProduct(productData);
    
    // 2. 상품코드 폴더 생성
    await createProductImageDir(product.id);
    
    // 3. 이미지 파일 처리
    const imageUrls: string[] = [];
    let imageNumber = 1;

    // 메인 이미지 처리
    if (mainImageFile) {
      const ext = path.extname(mainImageFile.originalname);
      const relativePath = await moveImageToProductFolder(
        mainImageFile.path,
        product.id,
        imageNumber,
        ext
      );
      const mainImageUrl = getImageUrl(relativePath);
      imageUrls.push(mainImageUrl);
      imageNumber++;
      
      await this.service.updateProduct(product.id, {
        main_image: mainImageUrl,
      });
    }

    // 추가 이미지 처리
    for (const file of infoImageFiles) {
      const ext = path.extname(file.originalname);
      const relativePath = await moveImageToProductFolder(
        file.path,
        product.id,
        imageNumber,
        ext
      );
      const imageUrl = getImageUrl(relativePath);
      imageUrls.push(imageUrl);
      imageNumber++;
    }

    // 4. 모든 이미지를 product_images 테이블에 저장
    if (imageUrls.length > 0) {
      await this.service.saveProductImages(product.id, imageUrls);
    }

    const finalProduct = await this.service.getProductById(product.id);
    res.status(201).json({
      success: true,
      data: finalProduct,
    });
  } catch (error: any) {
    // 에러 처리...
  }
};
```

### 방법 2: Multer에서 직접 상품코드 폴더에 저장

**문제점**: Multer 미들웨어 실행 시점에는 아직 상품 ID가 생성되지 않았음
**해결**: Request 객체에 상품 ID를 미리 포함시키거나, 임시 저장 후 이동 방식 사용

## 장단점 비교

### 새로운 구조의 장점 ✅

#### 1. 파일 관리 용이성
- ✅ 상품별 이미지를 한눈에 파악 가능
- ✅ 파일 탐색기에서 상품 폴더만 열면 모든 이미지 확인
- ✅ 특정 상품 이미지만 쉽게 찾을 수 있음

#### 2. 성능 향상
- ✅ 폴더 내 파일 수가 적어 디렉토리 탐색 속도 향상
- ✅ 대량의 상품 이미지가 있어도 특정 상품 폴더만 탐색
- ✅ 파일 시스템 성능 최적화

#### 3. 백업/복구 용이
- ✅ 상품별 폴더 단위로 백업 가능
- ✅ 특정 상품 이미지만 복구 가능
- ✅ 상품 삭제 시 폴더 전체 삭제로 간단

#### 4. 확장성
- ✅ 상품별로 추가 메타데이터 파일 저장 가능 (예: 설명 텍스트)
- ✅ 향후 상품별 썸네일 폴더 추가 가능
- ✅ 다양한 이미지 타입 분리 가능 (원본/썸네일/중간 크기)

#### 5. 보안/접근 제어
- ✅ 상품별로 접근 권한 설정 가능 (향후 확장)
- ✅ 특정 상품 이미지만 보호 가능

#### 6. 디버깅 용이
- ✅ 문제 발생 시 해당 상품 폴더만 확인
- ✅ 파일 구조가 직관적

### 새로운 구조의 단점 ⚠️

#### 1. 폴더 생성 오버헤드
- ⚠️ 각 상품마다 폴더 생성 필요 (성능 영향 미미)
- ⚠️ 파일 시스템의 inode 사용량 증가 (대부분의 경우 문제 없음)

#### 2. 구현 복잡도
- ⚠️ 폴더 생성 및 관리 로직 추가
- ⚠️ 상품 삭제 시 폴더 삭제 로직 필요

#### 3. 경로 길이 제한
- ⚠️ 일부 파일 시스템에서 경로 길이 제한 존재
- ⚠️ Windows: 260자, Linux: 4096자 (일반적으로 문제 없음)

## 폴더 구조 변형 옵션

### 옵션 1: 단순 구조 (권장)
```
uploads/products/
├── P001/
│   ├── 001.jpg
│   └── 002.jpg
└── P002/
    └── 001.jpg
```

### 옵션 2: 카테고리별 하위 폴더
```
uploads/products/
├── 봉제/
│   ├── P001/
│   │   └── 001.jpg
│   └── P002/
│       └── 001.jpg
└── 키링/
    └── P010/
        └── 001.jpg
```

**장점**: 카테고리별 관리 용이  
**단점**: 구현 복잡도 증가, 카테고리 변경 시 이동 필요

### 옵션 3: 날짜별 + 상품코드
```
uploads/products/
├── 2024/
│   └── 12/
│       ├── P001/
│       │   └── 001.jpg
│       └── P002/
│           └── 001.jpg
└── 2025/
    └── 01/
        └── P003/
            └── 001.jpg
```

**장점**: 월별 관리 용이, 오래된 데이터 아카이빙 용이  
**단점**: 경로 길이 증가, 구현 복잡도 증가

## 상품 삭제 시 폴더 관리

### 폴더 삭제 전략

#### 전략 1: 상품 삭제 시 폴더 전체 삭제 (권장)
```typescript
// productService.ts 또는 productRepository.ts
async deleteProduct(id: string): Promise<void> {
  // 1. DB에서 상품 삭제 (CASCADE로 이미지도 삭제됨)
  await this.repository.delete(id);
  
  // 2. 폴더 삭제
  const productDir = getProductImageDir(id);
  if (fs.existsSync(productDir)) {
    await fs.rm(productDir, { recursive: true, force: true });
  }
}
```

#### 전략 2: 폴더 유지 (아카이빙)
- 상품 삭제해도 이미지 폴더는 유지
- 향후 복구나 아카이빙 목적

## 이미지 추가/삭제 시 번호 관리

### 파일명 규칙

#### 규칙 1: 순차 번호 (권장)
- 메인 이미지: 항상 `001.jpg`
- 추가 이미지: `002.jpg`, `003.jpg`, ... 순차 할당
- 삭제 시: 빈 번호 허용 또는 재정렬

#### 규칙 2: 연속 번호 유지 (재정렬)
- 이미지 삭제 시 뒤의 파일명을 앞으로 당김
- 예: `001.jpg`, `002.jpg`, `004.jpg` → `001.jpg`, `002.jpg`, `003.jpg`
- 장점: 번호가 연속적
- 단점: 파일명 변경 작업 필요

## 에러 처리 및 롤백

### 에러 발생 시 처리

#### 1. 폴더 생성 실패
```typescript
try {
  await createProductImageDir(productId);
} catch (error) {
  // 폴더 생성 실패 시 임시 파일 정리
  // 상품 생성 롤백 또는 에러 응답
}
```

#### 2. 파일 이동 실패
```typescript
try {
  await moveImageToProductFolder(...);
} catch (error) {
  // 파일 이동 실패 시
  // - 이미 이동된 파일들 정리
  // - 임시 파일 정리
  // - DB 롤백
}
```

#### 3. 상품 삭제 시 폴더 삭제 실패
```typescript
try {
  await fs.rm(productDir, { recursive: true });
} catch (error) {
  // 로그 기록 후 계속 진행 (폴더는 나중에 정리)
  console.error(`폴더 삭제 실패: ${productDir}`, error);
}
```

## 현재 방식과 비교

### 현재 방식 (플랫 구조)
```
uploads/products/
├── file1.jpg
├── file2.jpg
├── file3.jpg
└── ... (수천 개 파일)
```

**특징:**
- 모든 파일이 한 폴더에 있음
- 파일 수가 많아질수록 디렉토리 탐색 속도 저하
- 파일 관리 어려움

### 새로운 방식 (폴더 구조)
```
uploads/products/
├── P001/
│   ├── 001.jpg
│   └── 002.jpg
└── P002/
    └── 001.jpg
```

**특징:**
- 상품별로 폴더 분리
- 파일 탐색 속도 향상
- 파일 관리 용이

## 구현 시 주의사항

### 1. 폴더명 검증
- 상품코드 형식 검증 (예: `P001` 형식)
- 특수 문자 제거
- 경로 탐색 공격 방지 (`..`, `/` 등)

```typescript
function validateProductId(productId: string): boolean {
  // P로 시작하고 숫자 3자리 형식 검증
  return /^P\d{3}$/.test(productId);
}
```

### 2. 폴더 권한
- 폴더 생성 시 적절한 권한 설정 (755 또는 775)
- 읽기/쓰기 권한 확인

### 3. 디스크 공간 모니터링
- 폴더별 크기 모니터링
- 전체 사용량 추적

### 4. 마이그레이션 전략
- 기존 이미지를 새 구조로 이동하는 마이그레이션 스크립트 필요
- 마이그레이션 중 서비스 중단 최소화

## 마이그레이션 전략 (기존 이미지 이동)

### 마이그레이션 스크립트 예시

```typescript
// migrate-images-to-folders.ts
import { pool } from './config/database.js';
import fs from 'fs/promises';
import path from 'path';

async function migrateImages() {
  // 1. 모든 상품 조회
  const [products] = await pool.execute('SELECT id, main_image FROM products');
  
  for (const product of products) {
    const productId = product.id;
    const productDir = path.join('uploads/products', productId);
    
    // 2. 상품코드 폴더 생성
    await fs.mkdir(productDir, { recursive: true });
    
    // 3. 메인 이미지 이동
    if (product.main_image) {
      const oldPath = path.join('uploads/products', path.basename(product.main_image));
      const newPath = path.join(productDir, '001.jpg');
      
      if (await fs.access(oldPath).then(() => true).catch(() => false)) {
        await fs.rename(oldPath, newPath);
        // DB 업데이트
        await pool.execute(
          'UPDATE products SET main_image = ? WHERE id = ?',
          [`/uploads/products/${productId}/001.jpg`, productId]
        );
      }
    }
    
    // 4. 추가 이미지 이동
    const [images] = await pool.execute(
      'SELECT image_url, display_order FROM product_images WHERE product_id = ? ORDER BY display_order',
      [productId]
    );
    
    let imageNumber = 2; // 001은 메인 이미지
    for (const image of images) {
      const oldPath = path.join('uploads/products', path.basename(image.image_url));
      const filename = `${String(imageNumber).padStart(3, '0')}.jpg`;
      const newPath = path.join(productDir, filename);
      
      if (await fs.access(oldPath).then(() => true).catch(() => false)) {
        await fs.rename(oldPath, newPath);
        // DB 업데이트
        await pool.execute(
          'UPDATE product_images SET image_url = ? WHERE product_id = ? AND display_order = ?',
          [`/uploads/products/${productId}/${filename}`, productId, image.display_order]
        );
        imageNumber++;
      }
    }
  }
}
```

## 결론

### ✅ 구현 가능성: **완전히 가능**

**권장 방식**: 방법 1 (임시 저장 후 상품코드 폴더로 이동)

### 최종 권장 폴더 구조

```
uploads/products/
├── P001/
│   ├── 001.jpg  (메인 이미지)
│   ├── 002.jpg  (추가 이미지 1)
│   └── 003.jpg  (추가 이미지 2)
├── P002/
│   ├── 001.jpg
│   └── 002.jpg
└── P003/
    └── 001.jpg
```

### 주요 장점 요약

1. ✅ **파일 관리 용이**: 상품별 이미지가 한 폴더에 모여있음
2. ✅ **성능 향상**: 디렉토리 탐색 속도 개선
3. ✅ **백업/복구 용이**: 상품 단위로 관리 가능
4. ✅ **확장성**: 상품별 추가 파일 저장 가능
5. ✅ **직관적 구조**: 파일 구조만 봐도 이해 가능

### 구현 우선순위

1. **1단계**: 기본 폴더 구조 구현
2. **2단계**: 상품 삭제 시 폴더 삭제 로직 추가
3. **3단계**: 마이그레이션 스크립트 작성 (기존 이미지 이동)
4. **4단계**: 이미지 추가/삭제 시 번호 재정렬 로직 (선택사항)

