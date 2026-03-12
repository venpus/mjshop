/** localStorage 키: 대시보드에서 원문+번역 함께 보기 */
export const DASHBOARD_SHOW_BOTH_LANGUAGES_KEY = 'dashboard_show_original_and_translation';

export function getDashboardShowBothLanguages(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_SHOW_BOTH_LANGUAGES_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDashboardShowBothLanguages(value: boolean): void {
  try {
    localStorage.setItem(DASHBOARD_SHOW_BOTH_LANGUAGES_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}
