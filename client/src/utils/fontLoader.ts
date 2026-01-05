/**
 * 한글 폰트 로더
 * 나눔고딕 폰트를 public/fonts에서 로드하여 jsPDF에 추가
 * 
 * 참고: jsPDF는 TTF 폰트만 지원합니다.
 * NanumGothic-Regular.ttf 파일을 public/fonts/ 폴더에 추가해야 합니다.
 */

// 폰트 파일 경로 (public 폴더 기준)
const NANUM_GOTHIC_FONT_PATH = '/fonts/NanumGothic-Regular.ttf';

let fontBase64: string | null = null;
let fontLoadPromise: Promise<string | null> | null = null;

/**
 * 나눔고딕 폰트를 Base64로 변환하여 로드
 */
async function loadNanumGothicFont(): Promise<string | null> {
  if (fontBase64) {
    return fontBase64;
  }

  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      const response = await fetch(NANUM_GOTHIC_FONT_PATH);
      if (!response.ok) {
        console.warn(`폰트 파일을 찾을 수 없습니다: ${NANUM_GOTHIC_FONT_PATH}`);
        return null;
      }
      const blob = await response.blob();
      
      return new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            // data URL에서 base64 부분만 추출
            const base64 = result.split(',')[1];
            fontBase64 = base64;
            resolve(base64);
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('나눔고딕 폰트 로드 오류:', error);
      return null;
    }
  })();

  return fontLoadPromise;
}

/**
 * jsPDF에 나눔고딕 폰트 추가
 */
export async function addNanumGothicFontToPDF(doc: any): Promise<boolean> {
  try {
    const base64 = await loadNanumGothicFont();
    
    if (!base64) {
      console.warn('폰트 파일을 로드할 수 없습니다. 기본 폰트를 사용합니다.');
      return false;
    }
    
    // VFS에 폰트 파일 추가
    doc.addFileToVFS('NanumGothic-Regular.ttf', base64);
    
    // 폰트 등록 (normal만 추가)
    doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
    
    return true;
  } catch (error) {
    console.warn('jsPDF에 폰트 추가 실패:', error);
    return false;
  }
}
