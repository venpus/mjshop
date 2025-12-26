import { useState, useEffect } from 'react';

export interface InlandCompany {
  id: number;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useLogisticsOptions() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  
  const [inlandCompanies, setInlandCompanies] = useState<InlandCompany[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 내륙운송회사 목록 조회
        const inlandCompaniesResponse = await fetch(`${API_BASE_URL}/logistics-options/inland-companies`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!inlandCompaniesResponse.ok) {
          throw new Error('내륙운송회사 목록을 불러오는데 실패했습니다.');
        }

        const inlandCompaniesData = await inlandCompaniesResponse.json();
        setInlandCompanies(inlandCompaniesData);

        // 도착 창고 목록 조회
        const warehousesResponse = await fetch(`${API_BASE_URL}/logistics-options/warehouses`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!warehousesResponse.ok) {
          throw new Error('도착 창고 목록을 불러오는데 실패했습니다.');
        }

        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      } catch (err) {
        console.error('물류 옵션 로드 오류:', err);
        setError(err instanceof Error ? err.message : '물류 옵션을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [API_BASE_URL]);

  return {
    inlandCompanies,
    warehouses,
    isLoading,
    error,
  };
}

