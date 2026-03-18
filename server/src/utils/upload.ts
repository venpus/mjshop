import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 업로드 디렉토리 경로 (server 폴더 내부의 uploads 폴더)
const uploadDir = path.join(__dirname, '../../uploads/products');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 파일 저장 설정 (임시 파일명으로 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 임시 파일명: UUID 사용
    const uuid = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다. (JPEG, PNG, GIF, WebP)'));
  }
};

// multer 설정
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 상품코드별 이미지 폴더 경로 반환
 */
export function getProductImageDir(productId: string): string {
  return path.join(uploadDir, productId);
}

/**
 * 상품코드 폴더 생성
 */
export async function createProductImageDir(productId: string): Promise<void> {
  const productDir = getProductImageDir(productId);
  if (!fs.existsSync(productDir)) {
    await fs.promises.mkdir(productDir, { recursive: true });
  }
}

/**
 * 상품의 기존 이미지 번호 중 최대값 조회 (빈 번호 허용, 재정렬 안 함)
 * @param productId 상품 ID
 * @returns 다음에 사용할 이미지 번호 (예: 기존이 001, 002, 004가 있으면 5 반환)
 */
export async function getNextImageNumber(productId: string): Promise<number> {
  const productDir = getProductImageDir(productId);
  
  if (!fs.existsSync(productDir)) {
    return 1; // 폴더가 없으면 첫 번째 이미지
  }

  try {
    const files = await fs.promises.readdir(productDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    if (imageFiles.length === 0) {
      return 1;
    }

    // 파일명에서 번호 추출 (001.jpg -> 1)
    const numbers = imageFiles
      .map(file => {
        const basename = path.basename(file, path.extname(file));
        const num = parseInt(basename, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return 1;
    }

    // 최대값 + 1 반환 (빈 번호 허용)
    return Math.max(...numbers) + 1;
  } catch (error) {
    console.error('이미지 번호 조회 오류:', error);
    return 1;
  }
}

/**
 * 파일을 상품코드 폴더로 이동 및 파일명 변경 (001.jpg, 002.jpg 형식)
 * 폴더 구조: uploads/products/P001/001.jpg
 * @param tempFilePath 임시 파일 경로
 * @param productId 상품 ID
 * @param imageNumber 이미지 번호 (1, 2, 3, ...)
 * @param originalExt 원본 파일 확장자
 * @returns 상대 경로 (products/P001/001.jpg 형식)
 */
export async function moveImageToProductFolder(
  tempFilePath: string,
  productId: string,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  // 1. 상품코드 폴더 생성
  await createProductImageDir(productId);
  
  // 2. 새 파일명 생성: 001.jpg, 002.jpg 형식 (3자리 번호)
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const productDir = getProductImageDir(productId);
  const newFilePath = path.join(productDir, newFilename);
  
  // 3. 임시 파일 존재 확인
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  
  // 4. 파일이 이미 존재하는지 확인 (빈 번호 허용 방식이므로 일반적으로 발생하지 않지만 확인)
  if (fs.existsSync(newFilePath)) {
    throw new Error(`이미지 파일이 이미 존재합니다: ${newFilePath}`);
  }
  
  // 5. 파일 이동 및 이름 변경
  await fs.promises.rename(tempFilePath, newFilePath);
  
  // 6. 상대 경로 반환 (URL 생성용)
  return `products/${productId}/${newFilename}`;
}

/**
 * 이미지 URL 생성 (폴더 구조 포함)
 * @param relativePath 상대 경로 (products/P001/001.jpg 형식)
 * @returns URL 경로 (/uploads/products/P001/001.jpg 형식)
 */
export function getImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * 파일 경로를 상대 경로로 변환
 */
export function getRelativePath(filePath: string): string {
  return path.relative(path.join(__dirname, '../../../'), filePath);
}

// ==================== Purchase Order Images ====================

// 발주 이미지 업로드 디렉토리 경로
const poUploadDir = path.join(__dirname, '../../uploads/purchase-orders');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(poUploadDir)) {
  fs.mkdirSync(poUploadDir, { recursive: true });
}

// 발주 이미지용 multer storage (임시 파일명으로 저장)
const poStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, poUploadDir);
  },
  filename: (req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});

// 발주 이미지용 multer 설정
export const poImageUpload = multer({
  storage: poStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 발주 이미지 타입별 폴더 경로 반환
 * @param purchaseOrderId 발주 ID
 * @param imageType 이미지 타입 (factory_shipment, return_exchange, work_item, logistics, other)
 * @returns 전체 경로 (uploads/purchase-orders/PO001/factory-shipment/)
 */
export function getPOImageDir(purchaseOrderId: string, imageType: string): string {
  return path.join(poUploadDir, purchaseOrderId, imageType);
}

/**
 * 발주 이미지 타입별 폴더 생성
 */
export async function createPOImageDir(purchaseOrderId: string, imageType: string): Promise<void> {
  const imageDir = getPOImageDir(purchaseOrderId, imageType);
  if (!fs.existsSync(imageDir)) {
    await fs.promises.mkdir(imageDir, { recursive: true });
  }
}

/**
 * 발주의 특정 타입 이미지 번호 조회 (다음에 사용할 번호)
 * @param purchaseOrderId 발주 ID
 * @param imageType 이미지 타입
 * @returns 다음에 사용할 이미지 번호
 */
export async function getNextPOImageNumber(purchaseOrderId: string, imageType: string): Promise<number> {
  const imageDir = getPOImageDir(purchaseOrderId, imageType);
  
  if (!fs.existsSync(imageDir)) {
    return 1;
  }

  try {
    const files = await fs.promises.readdir(imageDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    if (imageFiles.length === 0) {
      return 1;
    }

    // 파일명에서 번호 추출 (001.jpg -> 1)
    const numbers = imageFiles
      .map(file => {
        const basename = path.basename(file, path.extname(file));
        const num = parseInt(basename, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return 1;
    }

    // 최대값 + 1 반환 (빈 번호 허용)
    return Math.max(...numbers) + 1;
  } catch (error) {
    console.error('발주 이미지 번호 조회 오류:', error);
    return 1;
  }
}

/**
 * 파일을 발주 이미지 폴더로 이동 및 파일명 변경 (001.jpg, 002.jpg 형식)
 * 폴더 구조: uploads/purchase-orders/PO001/factory-shipment/001.jpg
 * @param tempFilePath 임시 파일 경로
 * @param purchaseOrderId 발주 ID
 * @param imageType 이미지 타입
 * @param imageNumber 이미지 번호
 * @param originalExt 원본 파일 확장자
 * @returns 상대 경로 (purchase-orders/PO001/factory-shipment/001.jpg 형식)
 */
export async function moveImageToPOFolder(
  tempFilePath: string,
  purchaseOrderId: string,
  imageType: string,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  // 1. 발주 이미지 타입별 폴더 생성
  await createPOImageDir(purchaseOrderId, imageType);
  
  // 2. 새 파일명 생성: 001.jpg, 002.jpg 형식 (3자리 번호)
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const imageDir = getPOImageDir(purchaseOrderId, imageType);
  const newFilePath = path.join(imageDir, newFilename);
  
  // 3. 임시 파일 존재 확인
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  
  // 4. 파일이 이미 존재하는지 확인
  if (fs.existsSync(newFilePath)) {
    throw new Error(`이미지 파일이 이미 존재합니다: ${newFilePath}`);
  }
  
  // 5. 파일 이동 및 이름 변경
  await fs.promises.rename(tempFilePath, newFilePath);
  
  // 6. 상대 경로 반환 (URL 생성용)
  return `purchase-orders/${purchaseOrderId}/${imageType}/${newFilename}`;
}

/**
 * 발주 이미지 URL 생성
 * @param relativePath 상대 경로 (purchase-orders/PO001/factory-shipment/001.jpg 형식)
 * @returns URL 경로 (/uploads/purchase-orders/PO001/factory-shipment/001.jpg 형식)
 */
export function getPOImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * 발주 삭제 시 이미지 폴더 삭제
 * @param purchaseOrderId 발주 ID
 */
export async function deletePOImageDir(purchaseOrderId: string): Promise<void> {
  const poDir = path.join(poUploadDir, purchaseOrderId);
  if (fs.existsSync(poDir)) {
    await fs.promises.rm(poDir, { recursive: true, force: true });
  }
}

/**
 * 발주 이미지 URL을 파일 시스템 경로로 변환
 * @param imageUrl 이미지 URL (/uploads/purchase-orders/PO001/work-item/001.jpg)
 * @returns 파일 시스템 절대 경로
 */
export function getPOImageFilePathFromUrl(imageUrl: string): string {
  // URL에서 /uploads/ 제거
  const relativePath = imageUrl.replace(/^\/uploads\//, '');
  // 파일 시스템 경로로 변환
  return path.join(__dirname, '../../uploads', relativePath);
}

/**
 * DB 이미지 타입을 폴더명으로 변환
 * @param dbImageType DB 이미지 타입 (factory_shipment, work_item 등)
 * @returns 폴더명 (factory-shipment, work-item 등)
 */
export function getPOImageFolderType(dbImageType: string): string {
  const imageTypeMap: Record<string, string> = {
    'factory_shipment': 'factory-shipment',
    'return_exchange': 'return-exchange',
    'work_item': 'work-item',
    'logistics': 'logistics',
    'other': 'other'
  };
  return imageTypeMap[dbImageType] || dbImageType;
}

/**
 * 발주 이미지 파일 복사 (재주문 시 사용)
 * @param sourceImageUrl 원본 이미지 URL (/uploads/purchase-orders/PO001/work-item/001.jpg)
 * @param targetPurchaseOrderId 대상 발주 ID
 * @param targetImageType 대상 이미지 타입 (DB enum: work_item 등)
 * @returns 새로운 이미지 URL
 */
export async function copyPOImageFile(
  sourceImageUrl: string,
  targetPurchaseOrderId: string,
  targetImageType: string
): Promise<string> {
  // 1. 원본 파일 경로 변환
  const sourceFilePath = getPOImageFilePathFromUrl(sourceImageUrl);
  
  // 2. 원본 파일 존재 확인
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`원본 이미지 파일을 찾을 수 없습니다: ${sourceImageUrl}`);
  }
  
  // 3. 폴더 타입 변환 (DB enum -> 폴더명)
  const folderType = getPOImageFolderType(targetImageType);
  
  // 4. 대상 폴더 생성
  await createPOImageDir(targetPurchaseOrderId, folderType);
  
  // 5. 다음 이미지 번호 조회
  const nextImageNumber = await getNextPOImageNumber(targetPurchaseOrderId, folderType);
  
  // 6. 파일 확장자 추출
  const ext = path.extname(sourceFilePath);
  
  // 7. 새 파일명 생성
  const newFilename = `${String(nextImageNumber).padStart(3, '0')}${ext}`;
  const targetDir = getPOImageDir(targetPurchaseOrderId, folderType);
  const targetFilePath = path.join(targetDir, newFilename);
  
  // 8. 파일 복사
  await fs.promises.copyFile(sourceFilePath, targetFilePath);
  
  // 9. 상대 경로 반환
  const relativePath = `purchase-orders/${targetPurchaseOrderId}/${folderType}/${newFilename}`;
  
  // 10. 새 이미지 URL 반환
  return getPOImageUrl(relativePath);
}

/**
 * 발주 메인 이미지 폴더 경로 반환
 * @param purchaseOrderId 발주 ID
 * @returns 전체 경로 (uploads/purchase-orders/PO001/)
 */
export function getPOMainImageDir(purchaseOrderId: string): string {
  return path.join(poUploadDir, purchaseOrderId);
}

/**
 * 발주 메인 이미지 파일 경로 반환
 * @param purchaseOrderId 발주 ID
 * @returns 전체 경로 (uploads/purchase-orders/PO001/main-image.jpg)
 */
export function getPOMainImagePath(purchaseOrderId: string, ext: string): string {
  const dir = getPOMainImageDir(purchaseOrderId);
  return path.join(dir, `main-image${ext}`);
}

/**
 * 발주 메인 이미지 저장
 * @param tempFilePath 임시 파일 경로
 * @param purchaseOrderId 발주 ID
 * @returns 상대 경로 (purchase-orders/PO001/main-image.jpg 형식)
 */
export async function savePOMainImage(
  tempFilePath: string,
  purchaseOrderId: string
): Promise<string> {
  // 1. 발주 폴더 생성
  const poDir = getPOMainImageDir(purchaseOrderId);
  if (!fs.existsSync(poDir)) {
    await fs.promises.mkdir(poDir, { recursive: true });
  }

  // 2. 파일 확장자 추출
  const ext = path.extname(tempFilePath);

  // 3. 새 파일 경로 (기존 메인 이미지 덮어쓰기)
  const newFilePath = getPOMainImagePath(purchaseOrderId, ext);

  // 4. 기존 메인 이미지 삭제 (다른 확장자일 수 있으므로)
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const possibleExt of possibleExtensions) {
    const oldPath = getPOMainImagePath(purchaseOrderId, possibleExt);
    if (fs.existsSync(oldPath) && oldPath !== newFilePath) {
      await fs.promises.unlink(oldPath).catch(() => {
        // 삭제 실패해도 계속 진행
      });
    }
  }

  // 5. 임시 파일 존재 확인
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }

  // 6. 파일 이동 및 이름 변경
  await fs.promises.rename(tempFilePath, newFilePath);

  // 7. 상대 경로 반환 (URL 생성용)
  return `purchase-orders/${purchaseOrderId}/main-image${ext}`;
}

/**
 * 발주 메인 이미지 복사 (재주문 시 사용)
 * @param sourceImageUrl 원본 메인 이미지 URL (/uploads/purchase-orders/PO001/main-image.jpg)
 * @param targetPurchaseOrderId 대상 발주 ID
 * @returns 새로운 메인 이미지 URL
 */
export async function copyPOMainImage(
  sourceImageUrl: string,
  targetPurchaseOrderId: string
): Promise<string> {
  // 1. 원본 파일 경로 변환
  const sourceFilePath = getPOImageFilePathFromUrl(sourceImageUrl);
  
  // 2. 원본 파일 존재 확인
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`원본 메인 이미지 파일을 찾을 수 없습니다: ${sourceImageUrl}`);
  }
  
  // 3. 대상 폴더 생성
  const targetDir = getPOMainImageDir(targetPurchaseOrderId);
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }
  
  // 4. 파일 확장자 추출
  const ext = path.extname(sourceFilePath);
  
  // 5. 대상 파일 경로 (main-image.jpg 형식)
  const targetFilePath = getPOMainImagePath(targetPurchaseOrderId, ext);
  
  // 6. 파일 복사
  await fs.promises.copyFile(sourceFilePath, targetFilePath);
  
  // 7. 상대 경로 반환
  return `purchase-orders/${targetPurchaseOrderId}/main-image${ext}`;
}

/**
 * 발주 메인 이미지 삭제
 * @param purchaseOrderId 발주 ID
 */
export async function deletePOMainImage(purchaseOrderId: string): Promise<void> {
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const ext of possibleExtensions) {
    const imagePath = getPOMainImagePath(purchaseOrderId, ext);
    if (fs.existsSync(imagePath)) {
      await fs.promises.unlink(imagePath).catch(() => {
        // 삭제 실패해도 계속 진행
      });
    }
  }
}

// ==================== Manufacturing Documents Images ====================

const manufacturingUploadDir = path.join(__dirname, '../../uploads/manufacturing');
if (!fs.existsSync(manufacturingUploadDir)) {
  fs.mkdirSync(manufacturingUploadDir, { recursive: true });
}

const manufacturingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, manufacturingUploadDir),
  filename: (_req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `temp-${uuid}${ext}`);
  },
});

export const manufacturingImageUpload = multer({
  storage: manufacturingStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function getManufacturingDocDir(docId: string): string {
  return path.join(manufacturingUploadDir, docId);
}

export function getManufacturingFinishedImagePath(docId: string, ext: string): string {
  return path.join(getManufacturingDocDir(docId), `finished-product${ext}`);
}

export async function saveManufacturingFinishedImage(tempFilePath: string, docId: string): Promise<string> {
  const dir = getManufacturingDocDir(docId);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const ext = path.extname(tempFilePath).toLowerCase() || '.jpg';
  const newPath = getManufacturingFinishedImagePath(docId, ext);
  const possibleExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const e of possibleExts) {
    const p = getManufacturingFinishedImagePath(docId, e);
    if (fs.existsSync(p) && p !== newPath) {
      await fs.promises.unlink(p).catch(() => {});
    }
  }
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  await fs.promises.rename(tempFilePath, newPath);
  return `manufacturing/${docId}/finished-product${ext}`;
}

export function getManufacturingStepImagesDir(docId: string, stepId: number): string {
  return path.join(manufacturingUploadDir, docId, 'steps', String(stepId));
}

export async function getNextManufacturingStepImageNumber(docId: string, stepId: number): Promise<number> {
  const dir = getManufacturingStepImagesDir(docId, stepId);
  if (!fs.existsSync(dir)) return 1;
  const files = await fs.promises.readdir(dir);
  const imageFiles = files.filter((f) => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(f).toLowerCase()));
  if (imageFiles.length === 0) return 1;
  const numbers = imageFiles
    .map((f) => parseInt(path.basename(f, path.extname(f)), 10))
    .filter((n) => !isNaN(n) && n > 0);
  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

export async function saveManufacturingStepImage(
  tempFilePath: string,
  docId: string,
  stepId: number,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  const dir = getManufacturingStepImagesDir(docId, stepId);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const newPath = path.join(dir, newFilename);
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  await fs.promises.rename(tempFilePath, newPath);
  return `manufacturing/${docId}/steps/${stepId}/${newFilename}`;
}

// 제조 문서 파일(엑셀/PDF) 업로드
const manufacturingDocUploadDir = path.join(manufacturingUploadDir, 'docs');
if (!fs.existsSync(manufacturingDocUploadDir)) {
  fs.mkdirSync(manufacturingDocUploadDir, { recursive: true });
}

const manufacturingDocFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.xlsx', '.xls', '.pdf'];
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('엑셀(.xlsx, .xls) 또는 PDF 파일만 업로드 가능합니다.'));
  }
};

const manufacturingDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, manufacturingDocUploadDir),
  filename: (_req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || '.xlsx';
    cb(null, `temp-${uuid}${ext}`);
  },
});

export const manufacturingDocumentFileUpload = multer({
  storage: manufacturingDocStorage,
  fileFilter: manufacturingDocFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export function getManufacturingDocumentFilePath(docId: string, fileName: string): string {
  return path.join(manufacturingDocUploadDir, docId, fileName);
}

export async function saveManufacturingDocumentFile(
  tempFilePath: string,
  docId: string,
  originalFileName: string
): Promise<string> {
  const dir = path.join(manufacturingDocUploadDir, docId);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const ext = path.extname(originalFileName).toLowerCase();
  const base = path.basename(originalFileName, ext);
  const safeName = `${base.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}${ext}`;
  const newPath = path.join(dir, safeName);
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  await fs.promises.rename(tempFilePath, newPath);
  return `manufacturing/docs/${docId}/${safeName}`;
}

const uploadsRoot = path.join(__dirname, '../../uploads');
export function getManufacturingDocumentAbsolutePath(relativePath: string): string {
  return path.join(uploadsRoot, relativePath);
}

// ==================== Material Images ====================

// 부자재 이미지 업로드 디렉토리 경로
const materialUploadDir = path.join(__dirname, '../../uploads/materials');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(materialUploadDir)) {
  fs.mkdirSync(materialUploadDir, { recursive: true });
}

// 부자재 이미지용 multer storage (임시 파일명으로 저장)
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, materialUploadDir);
  },
  filename: (req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});

// 부자재 이미지용 multer 설정
export const materialImageUpload = multer({
  storage: materialStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 부자재 이미지 타입별 폴더 경로 반환
 * @param materialCode 부자재 코드 (MAT001)
 * @param imageType 이미지 타입 (product, test)
 * @returns 전체 경로 (uploads/materials/MAT001/product/)
 */
export function getMaterialImageDir(materialCode: string, imageType: string): string {
  return path.join(materialUploadDir, materialCode, imageType);
}

/**
 * 부자재 이미지 타입별 폴더 생성
 */
export async function createMaterialImageDir(materialCode: string, imageType: string): Promise<void> {
  const imageDir = getMaterialImageDir(materialCode, imageType);
  if (!fs.existsSync(imageDir)) {
    await fs.promises.mkdir(imageDir, { recursive: true });
  }
}

/**
 * 부자재의 특정 타입 이미지 번호 조회 (다음에 사용할 번호)
 * @param materialCode 부자재 코드
 * @param imageType 이미지 타입 (product, test)
 * @returns 다음에 사용할 이미지 번호
 */
export async function getNextMaterialImageNumber(materialCode: string, imageType: string): Promise<number> {
  const imageDir = getMaterialImageDir(materialCode, imageType);
  
  if (!fs.existsSync(imageDir)) {
    return 1;
  }

  try {
    const files = await fs.promises.readdir(imageDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    if (imageFiles.length === 0) {
      return 1;
    }

    // 파일명에서 번호 추출 (001.jpg -> 1)
    const numbers = imageFiles
      .map(file => {
        const basename = path.basename(file, path.extname(file));
        const num = parseInt(basename, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return 1;
    }

    // 최대값 + 1 반환 (빈 번호 허용)
    return Math.max(...numbers) + 1;
  } catch (error) {
    console.error('부자재 이미지 번호 조회 오류:', error);
    return 1;
  }
}

/**
 * 파일을 부자재 이미지 폴더로 이동 및 파일명 변경 (001.jpg, 002.jpg 형식)
 * 폴더 구조: uploads/materials/MAT001/product/001.jpg
 * @param tempFilePath 임시 파일 경로
 * @param materialCode 부자재 코드
 * @param imageType 이미지 타입 (product, test)
 * @param imageNumber 이미지 번호
 * @param originalExt 원본 파일 확장자
 * @returns 상대 경로 (materials/MAT001/product/001.jpg 형식)
 */
export async function moveImageToMaterialFolder(
  tempFilePath: string,
  materialCode: string,
  imageType: string,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  // 1. 부자재 이미지 타입별 폴더 생성
  await createMaterialImageDir(materialCode, imageType);
  
  // 2. 새 파일명 생성: 001.jpg, 002.jpg 형식 (3자리 번호)
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const imageDir = getMaterialImageDir(materialCode, imageType);
  const newFilePath = path.join(imageDir, newFilename);
  
  // 3. 임시 파일 존재 확인
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  
  // 4. 파일이 이미 존재하는지 확인
  if (fs.existsSync(newFilePath)) {
    throw new Error(`이미지 파일이 이미 존재합니다: ${newFilePath}`);
  }
  
  // 5. 파일 이동 및 이름 변경
  await fs.promises.rename(tempFilePath, newFilePath);
  
  // 6. 상대 경로 반환 (URL 생성용)
  return `materials/${materialCode}/${imageType}/${newFilename}`;
}

/**
 * 부자재 이미지 URL 생성
 * @param relativePath 상대 경로 (materials/MAT001/product/001.jpg 형식)
 * @returns URL 경로 (/uploads/materials/MAT001/product/001.jpg 형식)
 */
export function getMaterialImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * 부자재 삭제 시 이미지 폴더 삭제
 * @param materialCode 부자재 코드
 */
export async function deleteMaterialImageDir(materialCode: string): Promise<void> {
  const materialDir = path.join(materialUploadDir, materialCode);
  if (fs.existsSync(materialDir)) {
    await fs.promises.rm(materialDir, { recursive: true, force: true });
  }
}

/**
 * 부자재 이미지 URL을 파일 시스템 경로로 변환
 * @param imageUrl 이미지 URL (/uploads/materials/MAT001/product/001.jpg)
 * @returns 파일 시스템 절대 경로
 */
export function getMaterialImageFilePathFromUrl(imageUrl: string): string {
  // URL에서 /uploads/ 제거
  const relativePath = imageUrl.replace(/^\/uploads\//, '');
  // 파일 시스템 경로로 변환
  return path.join(__dirname, '../../uploads', relativePath);
}

/**
 * 부자재 테스트 이미지를 발주 메인 이미지로 복사
 * @param testImageUrl 부자재 테스트 이미지 URL (/uploads/materials/MAT001/test/001.jpg)
 * @param purchaseOrderId 발주 ID
 * @returns 새로운 메인 이미지 상대 경로 (purchase-orders/PO001/main-image.jpg 형식)
 */
export async function copyMaterialTestImageToPOMainImage(
  testImageUrl: string,
  purchaseOrderId: string
): Promise<string> {
  // 1. 원본 파일 경로 변환
  const sourceFilePath = getMaterialImageFilePathFromUrl(testImageUrl);
  
  // 2. 원본 파일 존재 확인
  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`부자재 테스트 이미지 파일을 찾을 수 없습니다: ${testImageUrl}`);
  }
  
  // 3. 대상 폴더 생성
  const targetDir = getPOMainImageDir(purchaseOrderId);
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }
  
  // 4. 파일 확장자 추출
  const ext = path.extname(sourceFilePath);
  
  // 5. 대상 파일 경로 (main-image.jpg 형식)
  const targetFilePath = getPOMainImagePath(purchaseOrderId, ext);
  
  // 6. 기존 메인 이미지 삭제 (다른 확장자일 수 있으므로)
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  for (const possibleExt of possibleExtensions) {
    const oldPath = getPOMainImagePath(purchaseOrderId, possibleExt);
    if (fs.existsSync(oldPath) && oldPath !== targetFilePath) {
      await fs.promises.unlink(oldPath).catch(() => {
        // 삭제 실패해도 계속 진행
      });
    }
  }
  
  // 7. 파일 복사
  await fs.promises.copyFile(sourceFilePath, targetFilePath);
  
  // 8. 상대 경로 반환
  return `purchase-orders/${purchaseOrderId}/main-image${ext}`;
}

// ==================== Packing List Images ====================

// 패킹리스트 이미지 업로드 디렉토리 경로
const packingListUploadDir = path.join(__dirname, '../../uploads/packing-lists');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(packingListUploadDir)) {
  fs.mkdirSync(packingListUploadDir, { recursive: true });
}

// 패킹리스트 이미지용 multer storage (임시 파일명으로 저장)
const packingListStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, packingListUploadDir);
  },
  filename: (req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});

// 패킹리스트 이미지용 multer 설정
export const packingListImageUpload = multer({
  storage: packingListStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 패킹리스트 내륙송장 이미지 폴더 경로 반환
 * @param packingListId 패킹리스트 ID
 * @param invoiceId 내륙송장 ID
 * @returns 전체 경로 (uploads/packing-lists/1/invoices/1/)
 */
export function getPackingListInvoiceImageDir(packingListId: number, invoiceId: number): string {
  return path.join(packingListUploadDir, String(packingListId), 'invoices', String(invoiceId));
}

/**
 * 패킹리스트 내륙송장 이미지 폴더 생성
 */
export async function createPackingListInvoiceImageDir(packingListId: number, invoiceId: number): Promise<void> {
  const imageDir = getPackingListInvoiceImageDir(packingListId, invoiceId);
  if (!fs.existsSync(imageDir)) {
    await fs.promises.mkdir(imageDir, { recursive: true });
  }
}

/**
 * 패킹리스트 내륙송장의 기존 이미지 번호 조회 (다음에 사용할 번호)
 * @param packingListId 패킹리스트 ID
 * @param invoiceId 내륙송장 ID
 * @returns 다음에 사용할 이미지 번호
 */
export async function getNextPackingListInvoiceImageNumber(packingListId: number, invoiceId: number): Promise<number> {
  const imageDir = getPackingListInvoiceImageDir(packingListId, invoiceId);
  
  if (!fs.existsSync(imageDir)) {
    return 1;
  }

  try {
    const files = await fs.promises.readdir(imageDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    if (imageFiles.length === 0) {
      return 1;
    }

    // 파일명에서 번호 추출 (001.jpg -> 1)
    const numbers = imageFiles
      .map(file => {
        const basename = path.basename(file, path.extname(file));
        const num = parseInt(basename, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return 1;
    }

    // 최대값 + 1 반환
    return Math.max(...numbers) + 1;
  } catch (error) {
    console.error('패킹리스트 송장 이미지 번호 조회 오류:', error);
    return 1;
  }
}

/**
 * 파일을 패킹리스트 내륙송장 이미지 폴더로 이동 및 파일명 변경 (001.jpg, 002.jpg 형식)
 * 폴더 구조: uploads/packing-lists/1/invoices/1/001.jpg
 * @param tempFilePath 임시 파일 경로
 * @param packingListId 패킹리스트 ID
 * @param invoiceId 내륙송장 ID
 * @param imageNumber 이미지 번호
 * @param originalExt 원본 파일 확장자
 * @returns 상대 경로 (packing-lists/1/invoices/1/001.jpg 형식)
 */
export async function moveImageToPackingListInvoiceFolder(
  tempFilePath: string,
  packingListId: number,
  invoiceId: number,
  imageNumber: number,
  originalExt: string
): Promise<string> {
  // 1. 패킹리스트 내륙송장 이미지 폴더 생성
  await createPackingListInvoiceImageDir(packingListId, invoiceId);
  
  // 2. 새 파일명 생성: 001.jpg, 002.jpg 형식 (3자리 번호)
  const newFilename = `${String(imageNumber).padStart(3, '0')}${originalExt}`;
  const imageDir = getPackingListInvoiceImageDir(packingListId, invoiceId);
  const newFilePath = path.join(imageDir, newFilename);
  
  // 3. 임시 파일 존재 확인
  if (!fs.existsSync(tempFilePath)) {
    throw new Error(`임시 파일을 찾을 수 없습니다: ${tempFilePath}`);
  }
  
  // 4. 파일이 이미 존재하는지 확인
  if (fs.existsSync(newFilePath)) {
    throw new Error(`이미지 파일이 이미 존재합니다: ${newFilePath}`);
  }
  
  // 5. 파일 이동 및 이름 변경
  await fs.promises.rename(tempFilePath, newFilePath);
  
  // 6. 상대 경로 반환 (URL 생성용)
  return `packing-lists/${packingListId}/invoices/${invoiceId}/${newFilename}`;
}

/**
 * 패킹리스트 내륙송장 이미지 URL 생성
 * @param relativePath 상대 경로 (packing-lists/1/invoices/1/001.jpg 형식)
 * @returns URL 경로 (/uploads/packing-lists/1/invoices/1/001.jpg 형식)
 */
export function getPackingListInvoiceImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * 패킹리스트 내륙송장 이미지 URL을 파일 시스템 경로로 변환
 * @param imageUrl 이미지 URL (/uploads/packing-lists/1/invoices/1/001.jpg)
 * @returns 파일 시스템 절대 경로
 */
export function getPackingListInvoiceImageFilePathFromUrl(imageUrl: string): string {
  // URL에서 /uploads/ 제거
  const relativePath = imageUrl.replace(/^\/uploads\//, '');
  // 파일 시스템 경로로 변환
  return path.join(__dirname, '../../uploads', relativePath);
}

/**
 * 패킹리스트 삭제 시 이미지 폴더 삭제
 * @param packingListId 패킹리스트 ID
 */
export async function deletePackingListImageDir(packingListId: number): Promise<void> {
  const packingListDir = path.join(packingListUploadDir, String(packingListId));
  if (fs.existsSync(packingListDir)) {
    await fs.promises.rm(packingListDir, { recursive: true, force: true });
  }
}

/**
 * 패킹리스트 내륙송장 이미지 삭제
 * @param imageUrl 이미지 URL
 */
export async function deletePackingListInvoiceImage(imageUrl: string): Promise<void> {
  const filePath = getPackingListInvoiceImageFilePathFromUrl(imageUrl);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath).catch(() => {
      // 삭제 실패해도 계속 진행
    });
  }
}

// ==================== Project Images ====================

// 프로젝트 이미지 업로드 디렉토리 경로
const projectUploadDir = path.join(__dirname, '../../uploads/projects');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(projectUploadDir)) {
  fs.mkdirSync(projectUploadDir, { recursive: true });
}

// 프로젝트 이미지용 multer storage (임시 파일명으로 저장)
const projectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, projectUploadDir);
  },
  filename: (req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname);
    const filename = `temp-${uuid}${ext}`;
    cb(null, filename);
  }
});

// 프로젝트 이미지용 multer 설정
export const projectImageUpload = multer({
  storage: projectStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  }
});

/**
 * 프로젝트 이미지 저장 경로
 * uploads/projects/{project_id}/{entry_id}/{image_filename}
 */
export async function moveImageToProjectFolder(
  tempFilePath: string,
  projectId: number,
  entryId: number,
  imageNumber: number,
  ext: string
): Promise<string> {
  const projectDir = path.join(projectUploadDir, String(projectId), String(entryId));
  await fs.promises.mkdir(projectDir, { recursive: true });

  const filename = `image_${String(imageNumber).padStart(4, '0')}${ext}`;
  const finalPath = path.join(projectDir, filename);

  await fs.promises.rename(tempFilePath, finalPath);

  // 상대 경로 반환: projects/{project_id}/{entry_id}/{filename}
  return path.join('projects', String(projectId), String(entryId), filename).replace(/\\/g, '/');
}

/**
 * 프로젝트 이미지 URL 생성
 */
export function getProjectImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * 프로젝트 폴더 삭제
 */
export async function deleteProjectFolder(projectId: number): Promise<void> {
  const projectDir = path.join(projectUploadDir, String(projectId));
  try {
    await fs.promises.rm(projectDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`프로젝트 폴더 삭제 실패 (projectId: ${projectId}):`, error);
  }
}

/**
 * 프로젝트 항목 폴더 삭제
 */
export async function deleteProjectEntryFolder(projectId: number, entryId: number): Promise<void> {
  const entryDir = path.join(projectUploadDir, String(projectId), String(entryId));
  try {
    await fs.promises.rm(entryDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`프로젝트 항목 폴더 삭제 실패 (projectId: ${projectId}, entryId: ${entryId}):`, error);
  }
}

/**
 * 프로젝트 항목 이미지 번호 조회
 */
export async function getNextProjectImageNumber(projectId: number, entryId: number): Promise<number> {
  const entryDir = path.join(projectUploadDir, String(projectId), String(entryId));
  try {
    const files = await fs.promises.readdir(entryDir);
    const imageFiles = files.filter(file => file.startsWith('image_') && /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    if (imageFiles.length === 0) {
      return 1;
    }

    const numbers = imageFiles
      .map(file => {
        const match = file.match(/^image_(\d+)\./);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch (error) {
    // 폴더가 없으면 1부터 시작
    return 1;
  }
}

// ==================== Product Collab Images ====================

const productCollabUploadDir = path.join(__dirname, '../../uploads/product-collab');

if (!fs.existsSync(productCollabUploadDir)) {
  fs.mkdirSync(productCollabUploadDir, { recursive: true });
}

const productCollabStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const r = req as unknown as { params?: { id?: string }; path?: string };
    let id = r.params?.id;
    if (id == null && r.path) {
      const m = /\/products\/(\d+)\/upload/.exec(r.path);
      if (m) id = m[1];
    }
    const dir = path.join(productCollabUploadDir, String(id ?? 'temp'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** 이미지 전용 (제품 대표 이미지 등) */
export const productCollabImageUpload = multer({
  storage: productCollabStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** 스레드 첨부용: 모든 파일 형식 허용 */
export const productCollabFileUpload = multer({
  storage: productCollabStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export function getProductCollabImageUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/** product-collab URL을 파일 시스템 절대 경로로 변환 (다운로드용) */
export function getProductCollabFilePathFromUrl(urlPath: string): string {
  const normalized = urlPath.replace(/^\/uploads\//, '').replace(/^\/?/, '');
  if (!normalized.startsWith('product-collab/')) {
    throw new Error('Invalid path');
  }
  return path.join(productCollabUploadDir, normalized.replace(/^product-collab\//, ''));
}

/** 제품별 업로드 디렉터리 경로 (제품 삭제 시 폴더 제거용) */
export function getProductCollabProductUploadDir(productId: number): string {
  return path.join(productCollabUploadDir, String(productId));
}

/**
 * 프로젝트 초기 이미지 저장 경로
 * uploads/projects/{project_id}/initial/{image_filename}
 */
export async function moveImageToProjectInitialFolder(
  tempFilePath: string,
  projectId: number,
  imageNumber: number,
  ext: string
): Promise<string> {
  const initialDir = path.join(projectUploadDir, String(projectId), 'initial');
  await fs.promises.mkdir(initialDir, { recursive: true });

  const filename = `initial_${String(imageNumber).padStart(3, '0')}${ext}`;
  const finalPath = path.join(initialDir, filename);

  await fs.promises.rename(tempFilePath, finalPath);

  // 상대 경로 반환: projects/{project_id}/initial/{filename}
  return path.join('projects', String(projectId), 'initial', filename).replace(/\\/g, '/');
}

/**
 * 프로젝트 초기 이미지 번호 조회
 */
export async function getNextProjectInitialImageNumber(projectId: number): Promise<number> {
  const initialDir = path.join(projectUploadDir, String(projectId), 'initial');
  try {
    const files = await fs.promises.readdir(initialDir);
    const imageFiles = files.filter(file => file.startsWith('initial_') && /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    if (imageFiles.length === 0) {
      return 1;
    }

    const numbers = imageFiles
      .map(file => {
        const match = file.match(/^initial_(\d+)\./);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch (error) {
    // 폴더가 없으면 1부터 시작
    return 1;
  }
}

// ==================== Normal Invoice (정상 인보이스) ====================

const normalInvoiceUploadDir = path.join(__dirname, '../../uploads/normal-invoices');
if (!fs.existsSync(normalInvoiceUploadDir)) {
  fs.mkdirSync(normalInvoiceUploadDir, { recursive: true });
}

const normalInvoiceTempDir = path.join(normalInvoiceUploadDir, 'temp');
if (!fs.existsSync(normalInvoiceTempDir)) {
  fs.mkdirSync(normalInvoiceTempDir, { recursive: true });
}

const normalInvoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, normalInvoiceTempDir),
  filename: (_req, file, cb) => {
    const uuid = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || path.extname(file.originalname) || '';
    const safeName = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    cb(null, `${uuid}-${safeName}`);
  },
});

const normalInvoiceFileFilter: multer.Options['fileFilter'] = (_req, _file, cb) => cb(null, true);

export const normalInvoiceFileUpload = multer({
  storage: normalInvoiceStorage,
  fileFilter: normalInvoiceFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export function getNormalInvoiceEntryDir(entryId: number): string {
  return path.join(normalInvoiceUploadDir, String(entryId));
}

/** 임시 파일을 엔트리 폴더로 이동하고 상대 경로 반환 (normal-invoices/{entryId}/invoice.* 또는 photos/{name}) */
export async function saveNormalInvoiceFile(
  tempFilePath: string,
  entryId: number,
  fileKind: 'invoice' | 'photo',
  originalName: string
): Promise<string> {
  const entryDir = getNormalInvoiceEntryDir(entryId);
  await fs.promises.mkdir(entryDir, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || '';
  const baseName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  let relativePath: string;
  if (fileKind === 'invoice') {
    const filename = `invoice${ext}`;
    const destPath = path.join(entryDir, filename);
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.rename(tempFilePath, destPath);
    }
    relativePath = `normal-invoices/${entryId}/${filename}`;
  } else {
    const photosDir = path.join(entryDir, 'photos');
    await fs.promises.mkdir(photosDir, { recursive: true });
    const files = await fs.promises.readdir(photosDir).catch(() => []);
    const nextNum = files.length + 1;
    const filename = `${String(nextNum).padStart(3, '0')}-${baseName}${ext}`;
    const destPath = path.join(photosDir, filename);
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.rename(tempFilePath, destPath);
    }
    relativePath = `normal-invoices/${entryId}/photos/${filename}`;
  }
  return relativePath.replace(/\\/g, '/');
}

/** 엔트리 폴더 및 파일 삭제 */
export async function deleteNormalInvoiceEntryFiles(entryId: number): Promise<void> {
  const entryDir = getNormalInvoiceEntryDir(entryId);
  if (fs.existsSync(entryDir)) {
    await fs.promises.rm(entryDir, { recursive: true }).catch(() => {});
  }
}

/** 별도처리 금액 첨부파일 */
const paymentMiscRoot = path.join(__dirname, '../../uploads/payment-misc');
const paymentMiscAllowed = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

export const paymentMiscUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const id = (req.params as { id?: string }).id || '0';
      const dir = path.join(paymentMiscRoot, String(id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (paymentMiscAllowed.has(file.mimetype)) cb(null, true);
    else cb(new Error('허용되지 않는 파일 형식입니다. (PDF, 이미지, Word, Excel, ZIP)'));
  },
});