import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiBaseUrl } from '../api/baseUrl';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  level: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로딩 시 저장된 세션 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (id: string, password: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

    try {
      const response = await fetch(`${getApiBaseUrl()}/admin-accounts/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '로그인에 실패했습니다.');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const userData: AdminUser = {
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          level: data.data.level,
        };

        setUser(userData);
        localStorage.setItem('admin_user', JSON.stringify(userData));
      } else {
        throw new Error('로그인에 실패했습니다.');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const msg = error?.message || '';
      if (error?.name === 'AbortError') {
        throw new Error('서버 응답이 없습니다. 네트워크와 서버 주소를 확인한 뒤 다시 시도해 주세요.');
      }
      if (msg === 'Failed to fetch' || error?.name === 'TypeError') {
        throw new Error('서버에 연결할 수 없습니다. 네트워크와 API 주소(.env의 VITE_API_URL)를 확인한 뒤 앱을 다시 빌드해 주세요.');
      }
      throw new Error(msg || '로그인 중 오류가 발생했습니다.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('admin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

