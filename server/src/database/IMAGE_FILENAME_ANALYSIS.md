# 이미지 파일명 저장 방식 분석: 상품코드-001, 002 형식

## 요구사항

이미지 파일을 다음과 같은 형식으로 저장:
- 형식: `상품코드-번호.확장자`
- 예시: 
  - `P001-001.jpg` (메인 이미지)
  - `P001-002.jpg` (추가 이미지 1)
  - `P001-003.jpg` (추가 이미지 2)
  - `P002-001.jpg` (다른 상품의 메인 이미지)

## 현재 구현 방식

### 현재 파일명 규칙
```
원본파일명-타임스탬프-랜덤수.확장자
예: teddybear-1234567890-987654321.jpg
```

### 현재 구현 흐름
1. **Multer 미들웨어**: 파일을 즉시 `uploads/products/` 디렉토리에 저장
2. **파일명 생성**: `filename` 함수에서 타임스탬프 + 랜덤 수로 고유 파일명 생성
3. **상품 ID 생성**: 상품 데이터 저장 후 `generateNextId()` 호출
4. **이미지 URL 저장**: 생성된 파일명을 DB에 저장

## 새로운 방식 구현 가능성 분석

### ✅ 구현 가능

새로운 파일명 규칙(`상품코드-001`, `상품코드-002`)으로 저장하는 것이 **완전히 가능**합니다.

### 구현 방법

#### 방법 1: 임시 저장 후 파일명 변경 (권장)

**흐름:**
1. Multer로 임시 파일명으로 저장
2. 상품 ID 생성
3. 파일명을 `상품코드-001`, `상품코드-002` 형식으로 변경
4. DB에 새 파일명 저장

**장점:**
- ✅ 구현이 간단하고 안전
- ✅ 파일명 중복 문제 없음
- ✅ 순차적 번호 관리 가능

**단점:**
- ⚠️ 파일 이동 작업 추가 (성능 영향 미미)
- ⚠️ 에러 발생 시 임시 파일 정리 필요

#### 방법 2: Memory Storage 사용

**흐름:**
1. Multer memory storage로 파일을 메모리에 저장
2. 상품 ID 생성
3. 파일명을 지정하여 디스크에 저장

**장점:**
- ✅ 파일명을 완전히 제어 가능

**단점:**
- ⚠️ 메모리 사용량 증가 (대용량 파일 시 문제)
- ⚠️ 동시 업로드 시 메모리 부족 가능성

#### 방법 3: 두 단계 업로드

**흐름:**
1. 1단계: 상품 정보만 저장하여 상품 ID 생성
2. 2단계: 상품 ID를 포함하여 이미지 업로드

**장점:**
- ✅ 파일명을 정확히 제어

**단점:**
- ⚠️ 클라이언트 로직 복잡도 증가
- ⚠️ API 호출 2회 필요

## 권장 구현 방식: 방법 1 (임시 저장 후 파일명 변경)

### 구현 절차

#### 1단계: Multer 설정 변경

```typescript
// upload.ts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 임시 파일명: UUID 사용
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});
```

#### 2단계: 파일명 변경 함수 추가

```typescript
// upload.ts
export async function renameProductImage(
  oldPath: string,
  productId: string,
  imageNumber: number
): Promise<string> {
  const ext = path.extname(oldPath);
  const newFilename = `${productId}-${String(imageNumber).padStart(3, '0')}${ext}`;
  const newPath = path.join(uploadDir, newFilename);
  
  // 파일명 변경
  await fs.promises.rename(oldPath, newPath);
  
  return newFilename;
}
```

#### 3단계: Controller에서 파일명 변경

```typescript
// productController.ts
createProduct = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const mainImageFile = files.find((f) => f.fieldname === 'mainImage');
    const infoImageFiles = files.filter((f) => f.fieldname === 'infoImages');

    // 1. 상품 생성 (상품 ID 획득)
    const product = await this.service.createProduct(productData);
    
    // 2. 이미지 파일명 변경 및 처리
    const imageUrls: string[] = [];
    let imageNumber = 1;

    // 메인 이미지 처리
    if (mainImageFile) {
      const newFilename = await renameProductImage(
        mainImageFile.path,
        product.id,
        imageNumber
      );
      const mainImageUrl = getImageUrl(newFilename);
      imageUrls.push(mainImageUrl);
      imageNumber++;
      
      await this.service.updateProduct(product.id, {
        main_image: mainImageUrl,
      });
    }

    // 추가 이미지 처리
    for (const file of infoImageFiles) {
      const newFilename = await renameProductImage(
        file.path,
        product.id,
        imageNumber
      );
      const imageUrl = getImageUrl(newFilename);
      imageUrls.push(imageUrl);
      imageNumber++;
    }

    // 3. 이미지 URL을 DB에 저장
    if (imageUrls.length > 0) {
      await this.service.saveProductImages(product.id, imageUrls);
    }

    // ...
  } catch (error) {
    // 에러 발생 시 임시 파일 정리
    // ...
  }
};
```

### 파일명 번호 할당 규칙

#### 규칙 정의
1. **메인 이미지**: 항상 `상품코드-001`
2. **추가 이미지**: `상품코드-002`, `상품코드-003`, ... 순차적으로 할당
3. **최대 이미지 수**: 20개 (001~020)

#### 예시

**상품 P001의 이미지들:**
- `P001-001.jpg` (메인 이미지)
- `P001-002.jpg` (추가 이미지 1)
- `P001-003.jpg` (추가 이미지 2)
- `P001-004.jpg` (추가 이미지 3)

**상품 P002의 이미지들:**
- `P002-001.jpg` (메인 이미지)
- `P002-002.jpg` (추가 이미지 1)

## 장단점 비교

### 새로운 방식의 장점 ✅

1. **파일 관리 용이**
   - 파일명만으로 어떤 상품의 이미지인지 즉시 파악 가능
   - 파일 시스템에서 직접 찾기 쉬움

2. **일관성**
   - 모든 상품이 동일한 파일명 규칙 사용
   - 관리자 입장에서 이해하기 쉬움

3. **디버깅 용이**
   - 파일명만 봐도 상품 코드와 이미지 순서 파악 가능

4. **백업/복구 용이**
   - 파일명 규칙이 명확하여 자동화 스크립트 작성 용이

### 새로운 방식의 단점 ⚠️

1. **파일명 변경 작업 필요**
   - 저장 후 파일명 변경 단계 추가
   - 약간의 성능 오버헤드 (무시 가능 수준)

2. **에러 처리 복잡도 증가**
   - 파일명 변경 실패 시 롤백 필요
   - 임시 파일 정리 로직 필요

3. **이미지 추가/삭제 시 번호 관리**
   - 이미지 삭제 시 번호 재정렬 필요 (선택사항)
   - 또는 빈 번호 허용

## 이미지 추가/삭제 시 번호 관리 전략

### 전략 1: 번호 재정렬 (권장하지 않음)
- 이미지 삭제 시 뒤의 이미지 번호를 앞으로 당김
- 문제: 파일명 변경이 잦아 성능 저하, DB 업데이트 필요

### 전략 2: 빈 번호 허용 (권장)
- 이미지 삭제 시 해당 번호는 빈 상태로 유지
- 새 이미지 추가 시 마지막 번호 + 1로 할당
- 문제: 번호가 연속적이지 않을 수 있음
- 해결: `display_order` 필드로 실제 표시 순서 관리

### 전략 3: 중간 번호 재사용
- 이미지 삭제 시 해당 번호를 다음 추가 이미지에 재사용
- 문제: 구현 복잡도 증가

## 구현 시 주의사항

### 1. 파일명 중복 방지

**문제 상황:**
- 동시에 같은 상품코드로 요청이 들어올 경우
- 파일명 변경 중 경쟁 조건 발생 가능

**해결 방법:**
```typescript
// 파일 존재 확인 및 재시도
async function renameProductImage(...) {
  let attempt = 0;
  let newFilename: string;
  
  do {
    const number = imageNumber + attempt;
    newFilename = `${productId}-${String(number).padStart(3, '0')}${ext}`;
    attempt++;
  } while (fs.existsSync(path.join(uploadDir, newFilename)) && attempt < 100);
  
  // 파일명 변경
  await fs.promises.rename(oldPath, newPath);
  return newFilename;
}
```

### 2. 에러 처리 및 롤백

```typescript
try {
  // 파일명 변경 및 DB 저장
} catch (error) {
  // 실패한 파일들 삭제
  uploadedFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
  throw error;
}
```

### 3. 기존 파일과의 호환성

**문제:**
- 이미 저장된 파일들은 기존 방식의 파일명을 사용

**해결 방법:**
- 마이그레이션 스크립트 작성 (필요 시)
- 또는 두 방식 모두 지원하도록 처리

## 결론

### ✅ 구현 가능성: **완전히 가능**

**권장 방식**: 방법 1 (임시 저장 후 파일명 변경)
- 구현이 가장 간단하고 안전
- 성능 영향 최소
- 유지보수 용이

**예상 파일 구조:**
```
uploads/products/
├── P001-001.jpg (상품 P001의 메인 이미지)
├── P001-002.jpg (상품 P001의 추가 이미지 1)
├── P001-003.jpg (상품 P001의 추가 이미지 2)
├── P002-001.jpg (상품 P002의 메인 이미지)
└── P002-002.jpg (상품 P002의 추가 이미지 1)
```

**DB 저장 예시:**
```sql
-- products 테이블
main_image = '/uploads/products/P001-001.jpg'

-- product_images 테이블
product_id | image_url                          | display_order
-----------|------------------------------------|--------------
P001       | /uploads/products/P001-001.jpg     | 0
P001       | /uploads/products/P001-002.jpg     | 1
P001       | /uploads/products/P001-003.jpg     | 2
```

