import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/constants';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  level: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin';
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'admin_user';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 로딩 시 저장된 세션 확인
  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
          } catch (error) {
            console.error('Failed to parse saved user data:', error);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to load saved user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedUser();
  }, []);

  const login = async (id: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-accounts/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, password }),
      });

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
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } else {
        throw new Error('로그인에 실패했습니다.');
      }
    } catch (error: any) {
      throw new Error(error.message || '로그인 중 오류가 발생했습니다.');
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove user from storage:', error);
    }
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

