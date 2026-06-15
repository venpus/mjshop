import html2canvas from 'html2canvas';

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
  lineCount: number
): string {
  const datePart = formatStatementIssueDate(issuedAt);
  const companyPart = sanitizeFileNamePart(companyName);
  return `${datePart}_${companyPart}_${lineCount}건.png`;
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

export async function downloadHtmlAsPng(html: string, fileName: string): Promise<void> {
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

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  } finally {
    cleanup();
  }
}

export async function downloadShopOrderStatementAsPng(
  html: string,
  issuedAt: string,
  companyName: string,
  lineCount: number
): Promise<void> {
  const fileName = buildStatementPngFileName(issuedAt, companyName, lineCount);
  await downloadHtmlAsPng(html, fileName);
}
