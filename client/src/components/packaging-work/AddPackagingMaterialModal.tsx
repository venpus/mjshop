import { useState, useRef, useEffect } from 'react';
import { X, Upload, XCircle } from 'lucide-react';
import { PackagingMaterial } from './types';

interface AddPackagingMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (material: Omit<PackagingMaterial, 'id'>) => void;
}

/**
 * 포장자재 추가 모달 컴포넌트
 */
export function AddPackagingMaterialModal({
  isOpen,
  onClose,
  onAdd,
}: AddPackagingMaterialModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    nameChinese: '',
    price: '',
    images: [] as File[],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 코드 자동 생성 (예: PKG + 현재 시간 기반)
  const generateCode = (): string => {
    const timestamp = Date.now().toString().slice(-6); // 마지막 6자리
    return `PKG${timestamp}`;
  };

  // 모달이 열릴 때마다 코드 생성
  useEffect(() => {
    if (isOpen) {
      setGeneratedCode(generateCode());
    }
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const updatedFiles = [...formData.images, ...newFiles];
    setFormData((prev) => ({ ...prev, images: updatedFiles }));

    // 미리보기 생성
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedFiles = formData.images.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, images: updatedFiles }));

    // 미리보기 URL 해제
    URL.revokeObjectURL(imagePreviews[index]);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 입력값 검증
    if (!formData.name.trim()) {
      alert('포장자재명을 입력해주세요.');
      return;
    }
    if (!formData.nameChinese.trim()) {
      alert('중문명을 입력해주세요.');
      return;
    }
    if (!formData.price.trim() || parseFloat(formData.price) < 0) {
      alert('유효한 단가를 입력해주세요.');
      return;
    }

    // 코드 사용 (이미 생성된 코드)
    const code = generatedCode;

    // 이미지 업로드 처리
    let uploadedImageUrls: string[] = [];
    
    if (formData.images.length > 0) {
      try {
        // TODO: DB 연동 시 실제 이미지 업로드 API 호출
        // const formDataToUpload = new FormData();
        // formData.images.forEach((file) => {
        //   formDataToUpload.append('images', file);
        // });
        // const uploadResponse = await fetch('/api/packaging-materials/upload-images', {
        //   method: 'POST',
        //   body: formDataToUpload,
        // });
        // const uploadData = await uploadResponse.json();
        // uploadedImageUrls = uploadData.imageUrls;

        // 임시로 파일명 기반 URL 생성 (실제로는 서버에서 받아온 URL 사용)
        uploadedImageUrls = formData.images.map((file) => URL.createObjectURL(file));
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        alert('이미지 업로드에 실패했습니다.');
        return;
      }
    }

    // TODO: DB 연동 시 서버에 포장자재 추가 요청
    // POST /api/packaging-materials
    // {
    //   code: code,
    //   name: formData.name.trim(),
    //   nameChinese: formData.nameChinese.trim(),
    //   price: parseFloat(formData.price),
    //   stock: 0, // 재고는 자동 계산되므로 0으로 초기값 설정
    //   images: uploadedImageUrls,
    // }

    onAdd({
      code: code,
      name: formData.name.trim(),
      nameChinese: formData.nameChinese.trim(),
      price: parseFloat(formData.price),
      stock: 0, // 재고는 자동 계산되므로 0으로 초기값 설정
      images: uploadedImageUrls,
    });

    // 폼 초기화
    setFormData({
      name: '',
      nameChinese: '',
      price: '',
      images: [],
    });
    // 미리보기 URL 해제
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
    onClose();
  };

  const handleCancel = () => {
    // 폼 초기화
    setFormData({
      name: '',
      nameChinese: '',
      price: '',
      images: [],
    });
    // 미리보기 URL 해제
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">포장자재 추가</h2>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 컨텐츠 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      코드
                    </label>
                    <input
                      type="text"
                      value={generatedCode}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">코드는 자동으로 생성됩니다.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      포장자재명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="포장자재명 입력"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      중문명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nameChinese}
                      onChange={(e) => handleChange('nameChinese', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="중문명 입력"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      단가 (¥) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 사진 */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-700">사진</h3>
                </div>
                <div className="p-4 space-y-4">
                  {/* 이미지 미리보기 */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-300 group">
                          <img
                            src={preview}
                            alt={`미리보기 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            title="삭제"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 파일 업로드 버튼 */}
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">이미지 업로드</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500">여러 이미지를 한 번에 선택할 수 있습니다.</p>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                추가
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

