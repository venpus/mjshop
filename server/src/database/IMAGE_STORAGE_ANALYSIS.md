# 이미지 저장 방식 분석

## 현재 구현 방식

### 1. 파일 업로드 처리

#### 클라이언트 측 (ProductForm.tsx)
- **File 객체로 관리**: `mainImage` (단일 File), `infoImages` (File 배열)
- **FormData 사용**: 이미지 파일을 포함한 모든 데이터를 FormData로 전송
- **전송 방식**: `multipart/form-data` (multer가 자동 처리)

```typescript
const formDataToSend = new FormData();
formDataToSend.append('mainImage', mainImageFile);
formDataToSend.append('infoImages', infoImageFile1);
formDataToSend.append('infoImages', infoImageFile2);
// ... 기타 필드들
```

#### 서버 측 (upload.ts, productController.ts)
- **Multer 미들웨어**: 파일 업로드 처리
- **저장 위치**: `server/uploads/products/` 디렉토리
- **파일명 규칙**: `원본파일명-타임스탬프-랜덤수.확장자`
- **파일 크기 제한**: 10MB
- **허용 형식**: JPEG, JPG, PNG, GIF, WebP

**개선 가능한 구조:**
- 상품코드별 폴더 구조: `uploads/products/P001/001.jpg` 형식
- 자세한 내용은 `IMAGE_FOLDER_STRUCTURE_ANALYSIS.md` 참조

### 2. 데이터베이스 저장

#### products 테이블
- `main_image` (VARCHAR(500)): 메인 이미지 URL/경로 저장
- 현재: `/uploads/products/teddybear-1234567890-987654321.jpg`
- 개선 가능: `/uploads/products/P001-001.jpg` (상품코드-001 형식)

#### product_images 테이블
- `image_url` (VARCHAR(500)): 각 이미지의 URL/경로 저장
- `display_order` (INT): 이미지 표시 순서
- `product_id` (VARCHAR(50)): 상품 ID 외래키
- 개선 가능: `/uploads/products/P001-001.jpg`, `/uploads/products/P001-002.jpg` 형식

**참고**: 상품코드-001, 002 형식 파일명 저장 방식 분석은 `IMAGE_FILENAME_ANALYSIS.md` 참조

### 3. 이미지 접근 방식

#### 정적 파일 서빙 (index.ts)
```typescript
app.use('/uploads', express.static('uploads'));
```
- **URL 형식**: `http://localhost:3000/uploads/products/filename.jpg`
- **클라이언트 접근**: `<img src="http://localhost:3000/uploads/products/filename.jpg" />`

## 저장 흐름

### 상품 등록 시 이미지 저장 흐름

1. **클라이언트** → FormData로 이미지 파일 전송
2. **서버 (Multer)** → 파일을 `uploads/products/` 디렉토리에 저장
3. **서버 (Controller)** → 저장된 파일명으로 URL 생성 (`/uploads/products/filename.jpg`)
4. **서버 (Service/Repository)** → 
   - `products.main_image`에 메인 이미지 URL 저장
   - `product_images` 테이블에 모든 이미지 URL 저장 (display_order 포함)
5. **클라이언트** → 응답으로 받은 이미지 URL로 표시

## 장단점

### 장점
- ✅ 구현이 간단하고 빠름
- ✅ 추가 서비스 비용 없음
- ✅ 파일 시스템 직접 관리 가능

### 단점
- ❌ 서버 재시작/배포 시 파일 관리 복잡
- ❌ 스케일 아웃 시 파일 동기화 문제 (로드 밸런서 환경)
- ❌ 백업/복구 복잡도 증가
- ❌ CDN 활용 어려움
- ❌ 파일 서빙 성능 제한

## 향후 개선 방안

### 1. 클라우드 스토리지 사용 (권장)

#### AWS S3
- **장점**: 확장성, 안정성, CDN 연동 (CloudFront)
- **단점**: 비용 발생

#### 구현 예시
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'ap-northeast-2' });

async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const key = `products/${Date.now()}-${file.originalname}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fs.readFileSync(file.path),
    ContentType: file.mimetype,
  }));
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}
```

### 2. 이미지 최적화

#### Sharp 라이브러리 사용
```typescript
import sharp from 'sharp';

async function optimizeImage(file: Express.Multer.File): Promise<Buffer> {
  return sharp(file.path)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
```

### 3. 썸네일 생성

- **원본**: 고해상도 (1200x1200)
- **썸네일**: 저해상도 (300x300)
- 각각 별도로 저장하여 용량 절약

### 4. 이미지 캐싱

- **HTTP 캐싱 헤더**: `Cache-Control: max-age=31536000`
- **CDN 사용**: CloudFront, Cloudflare 등
- **ETag 활용**: 변경 감지 및 캐싱 최적화

## 현재 구현의 파일 구조

```
server/
├── uploads/
│   └── products/
│       ├── teddybear-1234567890-987654321.jpg
│       ├── teddybear-1234567891-123456789.jpg
│       └── ...
└── src/
    └── utils/
        └── upload.ts (multer 설정)
```

## 데이터베이스 예시

### products 테이블
```sql
INSERT INTO products (id, name, main_image, ...) VALUES
('P001', '테디베어 봉제인형', '/uploads/products/teddybear-1234567890-987654321.jpg', ...);
```

### product_images 테이블
```sql
INSERT INTO product_images (product_id, image_url, display_order) VALUES
('P001', '/uploads/products/teddybear-1234567890-987654321.jpg', 0),
('P001', '/uploads/products/teddybear-detail1-1234567891-123456789.jpg', 1),
('P001', '/uploads/products/teddybear-detail2-1234567892-234567890.jpg', 2);
```

## 보안 고려사항

1. **파일 타입 검증**: MIME 타입 검사 (현재 구현됨)
2. **파일 크기 제한**: 10MB 제한 (현재 구현됨)
3. **파일명 정제**: 특수 문자 제거 (현재 타임스탬프 + 랜덤으로 처리)
4. **업로드 경로 검증**: 상대 경로 공격 방지
5. **인증/인가**: 업로드 권한 확인 (향후 구현 필요)

## 성능 최적화 권장사항

1. **비동기 처리**: 이미지 최적화는 백그라운드 작업으로 처리
2. **큐 시스템**: 대용량 업로드 시 Redis Queue 사용 고려
3. **프록시 캐싱**: Nginx 등의 리버스 프록시로 정적 파일 캐싱
4. **압축**: 이미지 압축 라이브러리 활용 (Sharp)

