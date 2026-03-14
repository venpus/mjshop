import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const UAParser = require('ua-parser-js') as new (ua?: string) => { getResult: () => { device: { vendor?: string; model?: string; type?: string }; os: { name?: string; version?: string }; browser: { name?: string; version?: string } } };

const MAX_DEVICE_MODEL_LENGTH = 200;

/**
 * User-Agent 문자열에서 기기 모델/설명 문자열을 추출한다.
 * device vendor/model, OS, browser를 조합해 재사용 가능한 읽기 쉬운 문자열로 반환.
 */
export function parseDeviceModel(userAgent: string | undefined): string | null {
  if (!userAgent || !userAgent.trim()) return null;
  try {
    const ua = new UAParser(userAgent);
    const result = ua.getResult();
    const parts: string[] = [];

    const { vendor, model, type } = result.device;
    if (vendor || model) {
      const devicePart = [vendor, model].filter(Boolean).join(' ').trim();
      if (devicePart) parts.push(devicePart);
    }
    if (type && !parts.length) parts.push(type);

    const os = result.os;
    if (os.name) {
      const osPart = os.version ? `${os.name} ${os.version}` : os.name;
      if (osPart) parts.push(osPart);
    }

    const browser = result.browser;
    if (browser.name) {
      const browserPart = browser.version ? `${browser.name} ${browser.version}` : browser.name;
      if (browserPart) parts.push(browserPart);
    }

    const str = parts.length ? parts.join(' / ') : null;
    if (!str) return null;
    return str.length > MAX_DEVICE_MODEL_LENGTH
      ? str.slice(0, MAX_DEVICE_MODEL_LENGTH - 1) + '…'
      : str;
  } catch {
    return null;
  }
}
