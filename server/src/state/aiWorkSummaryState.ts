/** 사용자·언어별 요약 생성 중 여부. 키: `${userId}:${language}` */
const generating = new Map<string, boolean>();
/** 사용자·언어별 진행 단계. 요약 중 / 번역 중 구분용 */
const phase = new Map<string, 'summarizing' | 'translating'>();

function key(userId: string, language: string): string {
  return `${userId}:${language}`;
}

export function setGenerating(userId: string, language: string, value: boolean): void {
  const k = key(userId, language);
  if (value) generating.set(k, true);
  else {
    generating.delete(k);
    phase.delete(k);
  }
}

export function getGenerating(userId: string, language: string): boolean {
  return generating.get(key(userId, language)) === true;
}

export function setPhase(userId: string, language: string, value: 'summarizing' | 'translating' | null): void {
  const k = key(userId, language);
  if (value === null) phase.delete(k);
  else phase.set(k, value);
}

export function getPhase(userId: string, language: string): 'summarizing' | 'translating' | null {
  return phase.get(key(userId, language)) ?? null;
}

export function getStatus(userId: string, language: string): { generating: boolean; phase: 'summarizing' | 'translating' | null } {
  const k = key(userId, language);
  return {
    generating: generating.get(k) === true,
    phase: phase.get(k) ?? null,
  };
}
