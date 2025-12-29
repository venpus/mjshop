import { useState, useEffect } from 'react';
import { Box, Plus } from 'lucide-react';
import { MaterialsList, Material } from './materials/MaterialsList';
import { MaterialForm, MaterialFormDataWithFiles } from './materials/MaterialForm';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 부자재 목록 로드
  const loadMaterials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/materials`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '부자재 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // 서버 응답을 클라이언트 형식으로 변환
        const convertedMaterials: Material[] = data.data.map((m: any) => {
          // 이미지 URL을 전체 URL로 변환
          const convertImageUrl = (url: string) => {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return `${SERVER_BASE_URL}${url}`;
          };

          return {
            id: m.id,
            date: typeof m.date === 'string' ? m.date : m.date.toISOString().split('T')[0],
            code: m.code,
            productName: m.productName,
            productNameChinese: m.productNameChinese || '',
            category: m.category,
            typeCount: m.typeCount,
            link: m.link || '',
            purchaseComplete: m.purchaseComplete,
            images: (m.images?.product || []).map(convertImageUrl),
            testImages: (m.images?.test || []).map(convertImageUrl),
            price: m.price != null ? (typeof m.price === 'number' ? m.price : parseFloat(m.price)) : 0,
            currentStock: m.currentStock != null ? m.currentStock : 0,
          };
        });
        setMaterials(convertedMaterials);
      } else {
        throw new Error('데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '부자재 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('부자재 목록 로드 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleAdd = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleSaveMaterial = async (formData: MaterialFormDataWithFiles) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      // FormData 생성
      const formDataToSend = new FormData();
      
      // 텍스트 필드 추가
      formDataToSend.append('date', formData.date);
      if (formData.productName) {
        formDataToSend.append('productName', formData.productName);
      }
      if (formData.productNameChinese) {
        formDataToSend.append('productNameChinese', formData.productNameChinese);
      }
      formDataToSend.append('category', formData.category);
      formDataToSend.append('typeCount', formData.typeCount.toString());
      if (formData.link) {
        formDataToSend.append('link', formData.link);
      }
      if (formData.price !== '') {
        formDataToSend.append('price', formData.price.toString());
      }

      // 이미지 파일 추가
      if (formData.productImages && formData.productImages.length > 0) {
        formData.productImages.forEach((file) => {
          formDataToSend.append('productImages', file);
        });
      }

      // API 호출
      const response = await fetch(`${API_BASE_URL}/materials`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '부자재 저장에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('부자재가 성공적으로 생성되었습니다.');
        setIsFormOpen(false);
        // 부자재 목록 새로고침
        await loadMaterials();
      } else {
        throw new Error(result.error || '부자재 저장에 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '부자재 저장 중 오류가 발생했습니다.');
      console.error('부자재 저장 오류:', error);
    }
  };

  const handleEdit = (material: Material) => {
    console.log('수정:', material);
    // TODO: 수정 기능 구현
    alert(`수정: ${material.productName}`);
  };

  const handleDelete = async (material: Material) => {
    if (!confirm(`${material.productName}을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 이미지와 메타데이터도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/materials/${material.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '부자재 삭제에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success) {
        alert('부자재가 성공적으로 삭제되었습니다.');
        // 부자재 목록 새로고침
        await loadMaterials();
      } else {
        throw new Error(result.error || '부자재 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '부자재 삭제 중 오류가 발생했습니다.');
      console.error('부자재 삭제 오류:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-gray-900">부자재 관리</h2>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                부자재 재고 및 관리를 수행합니다.
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>부자재 추가</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">부자재 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadMaterials}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <MaterialsList 
            materials={materials} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* 부자재 추가/수정 모달 */}
      {isFormOpen && (
        <MaterialForm
          onClose={handleCloseForm}
          onSave={handleSaveMaterial}
          mode="create"
        />
      )}
    </div>
  );
}
