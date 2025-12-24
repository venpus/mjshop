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

