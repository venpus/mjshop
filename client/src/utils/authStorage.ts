/** 로그인 저장소: 자동 로그인 OFF면 sessionStorage, ON이면 localStorage 사용 */

const ADMIN_USER_KEY = 'admin_user';
const ADMIN_AUTO_LOGIN_KEY = 'admin_auto_login';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  level: string;
}

export function isAutoLogin(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTO_LOGIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function getAdminUser(): AdminUser | null {
  try {
    const storage = isAutoLogin() ? localStorage : sessionStorage;
    const raw = storage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AdminUser;
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

export function setAdminUser(user: AdminUser, autoLogin: boolean): void {
  const userJson = JSON.stringify(user);
  if (autoLogin) {
    localStorage.setItem(ADMIN_USER_KEY, userJson);
    localStorage.setItem(ADMIN_AUTO_LOGIN_KEY, '1');
    sessionStorage.removeItem(ADMIN_USER_KEY);
  } else {
    sessionStorage.setItem(ADMIN_USER_KEY, userJson);
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_AUTO_LOGIN_KEY);
  }
}

export function removeAdminUser(): void {
  try {
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_AUTO_LOGIN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    // ignore
  }
}
