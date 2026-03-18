/**
 * multipart 파일명: 브라우저 UTF-8 바이트가 multer/busboy에서 latin1 문자열로 잘못 해석되는 경우 복원
 */
export function decodeMultipartFilenameLatin1Utf8(name: string): string {
  if (!name) return '';
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

/**
 * 저장용 원본 파일명: 클라이언트가 UTF-8로 보낸 필드 우선, 없으면 latin1→utf8 복원
 */
export function resolveUploadedDisplayName(
  multerOriginalname: string,
  body: Record<string, unknown> | undefined
): string {
  const raw = body?.original_filename;
  const fromBody = Array.isArray(raw) ? raw[0] : raw;
  if (typeof fromBody === 'string') {
    const t = fromBody.trim();
    if (t.length > 0) return t.slice(0, 255);
  }
  const decoded = decodeMultipartFilenameLatin1Utf8(multerOriginalname || '').trim();
  return (decoded || multerOriginalname || 'file').slice(0, 255);
}
