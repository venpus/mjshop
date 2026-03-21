/** 사용자·언어별 요약/번역 진행 로그 버퍼. 키: `${userId}:${language}` */
const logBuffer = new Map<string, string[]>();

function key(userId: string, language: string): string {
  return `${userId}:${language}`;
}

export function appendLog(userId: string, language: string, message: string): void {
  const k = key(userId, language);
  const buf = logBuffer.get(k) ?? [];
  buf.push(message);
  logBuffer.set(k, buf);
}

export function getLogs(userId: string, language: string): string[] {
  return [...(logBuffer.get(key(userId, language)) ?? [])];
}

export function clearLogs(userId: string, language: string): void {
  logBuffer.delete(key(userId, language));
}
