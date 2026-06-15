import html2canvas from 'html2canvas';
import JSZip from 'jszip';

export interface StatementPngDownloadItem {
  html: string;
  issuedAt: string;
  companyName: string;
  lineCount: number;
  isReservation?: boolean;
}

function sanitizeFileNamePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || '미상'
  );
}

function formatStatementIssueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10).replace(/\./g, '-');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildStatementPngFileName(
  issuedAt: string,
  companyName: string,
  lineCount: number,
  isReservation = false
): string {
  const datePart = formatStatementIssueDate(issuedAt);
  const companyPart = sanitizeFileNamePart(companyName);
  const kindSuffix = isReservation ? '_예약' : '';
  return `${datePart}_${companyPart}_${lineCount}건${kindSuffix}.png`;
}

function createStatementRenderRoot(html: string): {
  target: HTMLElement;
  cleanup: () => void;
} {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;overflow:visible;background:#fff;';

  const styleText = Array.from(parsed.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n');
  if (styleText) {
    const styleEl = document.createElement('style');
    styleEl.textContent = styleText;
    host.appendChild(styleEl);
  }

  const mount = document.createElement('div');
  mount.innerHTML = parsed.body.innerHTML;
  host.appendChild(mount);

  document.body.appendChild(host);

  const target = (mount.querySelector('.sheet') as HTMLElement | null) ?? mount;

  return {
    target,
    cleanup: () => {
      host.remove();
    },
  };
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}

export async function htmlToPngBlob(html: string): Promise<Blob> {
  const { target, cleanup } = createStatementRenderRoot(html);

  try {
    await document.fonts.ready;
    await waitForImages(target);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      throw new Error('PNG 생성에 실패했습니다.');
    }

    return blob;
  } finally {
    cleanup();
  }
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type StatementBulkDownloadDelivery = 'folder' | 'zip';

export function isDirectoryPickerSupported(): boolean {
  return window.isSecureContext && typeof window.showDirectoryPicker === 'function';
}

export async function pickStatementDownloadDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isDirectoryPickerSupported()) {
    throw new Error(
      '폴더 선택 다운로드는 HTTPS 또는 localhost 접속에서만 사용할 수 있습니다. ZIP 다운로드로 대체합니다.'
    );
  }

  return window.showDirectoryPicker();
}

function ensureUniqueFileName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const ext = '.png';
  const stem = baseName.endsWith(ext) ? baseName.slice(0, -ext.length) : baseName;
  let index = 2;
  while (usedNames.has(`${stem}_${index}${ext}`)) {
    index += 1;
  }

  const uniqueName = `${stem}_${index}${ext}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

async function saveBlobToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function saveStatementPngsToDirectory(
  items: StatementPngDownloadItem[],
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const usedNames = new Set<string>();
  let saved = 0;

  for (const item of items) {
    const baseName = buildStatementPngFileName(
      item.issuedAt,
      item.companyName,
      item.lineCount,
      item.isReservation ?? false
    );
    const fileName = ensureUniqueFileName(baseName, usedNames);
    const blob = await htmlToPngBlob(item.html);
    await saveBlobToDirectory(dirHandle, fileName, blob);
    saved += 1;
    onProgress?.(saved, items.length);
  }

  return saved;
}

function buildStatementZipFileName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `명세서_${today}.zip`;
}

export async function downloadStatementPngsAsZip(
  items: StatementPngDownloadItem[],
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  if (items.length === 0) return 0;

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let saved = 0;

  for (const item of items) {
    const baseName = buildStatementPngFileName(
      item.issuedAt,
      item.companyName,
      item.lineCount,
      item.isReservation ?? false
    );
    const fileName = ensureUniqueFileName(baseName, usedNames);
    const blob = await htmlToPngBlob(item.html);
    zip.file(fileName, blob);
    saved += 1;
    onProgress?.(saved, items.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(zipBlob, buildStatementZipFileName());
  return saved;
}

export async function downloadStatementPngsBulk(
  items: StatementPngDownloadItem[],
  onProgress?: (current: number, total: number) => void
): Promise<{ saved: number; delivery: StatementBulkDownloadDelivery }> {
  if (items.length === 0) {
    return { saved: 0, delivery: 'zip' };
  }

  if (isDirectoryPickerSupported()) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const saved = await saveStatementPngsToDirectory(items, dirHandle, onProgress);
      return { saved, delivery: 'folder' };
    } catch (error) {
      if (isDirectoryPickerAbortError(error)) {
        throw error;
      }
    }
  }

  const saved = await downloadStatementPngsAsZip(items, onProgress);
  return { saved, delivery: 'zip' };
}

export function formatStatementBulkDownloadMessage(
  saved: number,
  delivery: StatementBulkDownloadDelivery
): string {
  if (delivery === 'folder') {
    return `${saved.toLocaleString()}장의 명세서 PNG를 선택한 폴더에 저장했습니다.`;
  }

  return `${saved.toLocaleString()}장의 명세서를 ZIP 파일로 다운로드했습니다.\n(폴더 선택은 HTTPS 또는 localhost 접속에서 사용할 수 있습니다.)`;
}

export async function downloadHtmlAsPng(html: string, fileName: string): Promise<void> {
  const blob = await htmlToPngBlob(html);
  triggerBlobDownload(blob, fileName);
}

export async function downloadShopOrderStatementAsPng(
  html: string,
  issuedAt: string,
  companyName: string,
  lineCount: number,
  isReservation = false
): Promise<void> {
  const fileName = buildStatementPngFileName(issuedAt, companyName, lineCount, isReservation);
  await downloadHtmlAsPng(html, fileName.endsWith('.png') ? fileName : `${fileName}.png`);
}

export function isDirectoryPickerAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
