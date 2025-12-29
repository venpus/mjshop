import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { GalleryImageModal } from '../GalleryImageModal';
import { PurchaseOrderForm, PurchaseOrderFormData } from '../PurchaseOrderForm';
import { Material } from './types';
import { MaterialInfoTable } from './MaterialInfoTable';
import { MaterialTabs } from './MaterialTabs';
import { useAuth } from '../../contexts/AuthContext';
import { useTestImageMetadata } from '../../hooks/useTestImageMetadata';

export function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [originalMaterial, setOriginalMaterial] = useState<Material | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'inventory'>('photos');
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [selectedTestImageUrl, setSelectedTestImageUrl] = useState<string | null>(null);
  const [inventoryRecords, setInventoryRecords] = useState<any[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 테스트 이미지 메타데이터 관리 훅
  const {
    metadata: testImageMetadata,
    isLoading: isLoadingMetadata,
    loadMetadata: loadTestImageMetadata,
    updateMetadata: updateTestImageMetadata,
    getMetadataByImageUrl,
  } = useTestImageMetadata(id ? parseInt(id, 10) : null);

  // 메타데이터를 인덱스 기반 객체로 변환 (리렌더링을 위해 useState 사용)
  const [testImageReactions, setTestImageReactions] = useState<Record<number, 'like' | 'dislike' | null>>({});
  const [testImageMemoInputs, setTestImageMemoInputs] = useState<Record<number, string>>({});
  const [testImageMemoConfirmations, setTestImageMemoConfirmations] = useState<
    Record<number, { confirmedBy: string; confirmedAt: string } | null>
  >({});

  // 메타데이터가 로드되면 인덱스 기반 객체로 변환
  useEffect(() => {
    if (!material || !material.testImages) {
      setTestImageReactions({});
      setTestImageMemoInputs({});
      setTestImageMemoConfirmations({});
      return;
    }

    const reactions: Record<number, 'like' | 'dislike' | null> = {};
    const memos: Record<number, string> = {};
    const confirmations: Record<number, { confirmedBy: string; confirmedAt: string } | null> = {};

    material.testImages.forEach((imageUrl, index) => {
      // 전체 URL에서 상대 경로로 변환
      const relativeUrl = imageUrl.replace(/^https?:\/\/[^/]+/, '');
      const metadata = testImageMetadata.find((m) => m.imageUrl === relativeUrl || m.imageUrl === imageUrl);

      if (metadata) {
        reactions[index] = metadata.reaction;
        memos[index] = metadata.memo || '';
        if (metadata.confirmedBy && metadata.confirmedAt) {
          confirmations[index] = {
            confirmedBy: metadata.confirmedBy,
            confirmedAt: metadata.confirmedAt,
          };
        } else {
          confirmations[index] = null;
        }
      } else {
        reactions[index] = null;
        memos[index] = '';
        confirmations[index] = null;
      }
    });

    setTestImageReactions(reactions);
    setTestImageMemoInputs(memos);
    setTestImageMemoConfirmations(confirmations);
  }, [material, testImageMetadata]);
  const originalMaterialInitializedRef = useRef(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  // 부자재 데이터 로드 함수 (useEffect 밖으로 분리)
  const loadMaterial = async () => {
    if (!id) {
      setError('부자재 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '부자재 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const m = data.data;
        // 이미지 URL을 전체 URL로 변환
        const convertImageUrl = (url: string) => {
          if (!url) return '';
          if (url.startsWith('http')) return url;
          return `${SERVER_BASE_URL}${url}`;
        };

        // 서버 응답을 클라이언트 형식으로 변환
        const convertedMaterial: Material = {
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
        setMaterial(convertedMaterial);
        setOriginalMaterial(convertedMaterial);
        originalMaterialInitializedRef.current = false; // 리셋
      } else {
        throw new Error('부자재 정보를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '부자재 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('부자재 로드 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // API에서 부자재 데이터 가져오기
  useEffect(() => {
    loadMaterial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // originalMaterial이 설정되면 isDirty를 false로 초기화
  useEffect(() => {
    if (originalMaterial && !originalMaterialInitializedRef.current) {
      setIsDirty(false);
      originalMaterialInitializedRef.current = true;
    }
  }, [originalMaterial]);

  // material 변경 시 isDirty 체크
  useEffect(() => {
    if (!originalMaterial || !material || !originalMaterialInitializedRef.current) {
      return;
    }

    // 변경된 필드 체크
    const hasChanges =
      material.category !== originalMaterial.category ||
      material.typeCount !== originalMaterial.typeCount ||
      material.price !== originalMaterial.price ||
      material.purchaseComplete !== originalMaterial.purchaseComplete ||
      material.link !== originalMaterial.link;

    setIsDirty(hasChanges);
  }, [material, originalMaterial]);

  const currentManagerName = user?.name || '관리자'; // AuthContext에서 가져오기

  // 부자재 저장
  const handleSave = async () => {
    if (!id || !material || isSaving || !isDirty) return;

    setIsSaving(true);
    try {
      const updateData = {
        category: material.category,
        typeCount: material.typeCount,
        price: material.price || null,
        purchaseComplete: material.purchaseComplete,
        link: material.link || null,
      };

      const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '부자재 저장에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        // 저장 성공 시 originalMaterial 업데이트
        setOriginalMaterial(material);
        setIsDirty(false);
        alert('부자재가 성공적으로 저장되었습니다.');
      } else {
        throw new Error(data.error || '부자재 저장에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '부자재 저장 중 오류가 발생했습니다.');
      console.error('부자재 저장 오류:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductImageUpload = () => {
    alert('사진 업로드 기능 구현 예정');
    // TODO: 사진 업로드 로직 구현
  };

  const handleTestImageUpload = () => {
    if (!id || !material) {
      alert('부자재 정보를 불러올 수 없습니다.');
      return;
    }

    // 파일 input 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      
      if (files.length === 0) {
        return;
      }

      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('testImages', file);
        });

        const response = await fetch(`${API_BASE_URL}/materials/${id}/test-images`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '테스트 이미지 업로드에 실패했습니다.');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || '테스트 이미지 업로드에 실패했습니다.');
        }

        // 업로드 성공 후 부자재 데이터 및 메타데이터 재로드
        await loadMaterial();
        await loadTestImageMetadata();

        alert('테스트 이미지가 성공적으로 업로드되었습니다.');
      } catch (error: any) {
        console.error('테스트 이미지 업로드 오류:', error);
        alert(error.message || '테스트 이미지 업로드 중 오류가 발생했습니다.');
      }

      // 파일 input 제거
      document.body.removeChild(fileInput);
    };

    // 파일 input을 DOM에 추가하고 클릭 이벤트 발생
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  /**
   * 반응 변경 핸들러
   */
  const handleReactionChange = async (index: number, reaction: 'like' | 'dislike' | null) => {
    if (!material || !material.testImages || index >= material.testImages.length) {
      return;
    }

    const imageUrl = material.testImages[index];
    // 전체 URL에서 상대 경로로 변환
    const relativeUrl = imageUrl.replace(/^https?:\/\/[^/]+/, '');

    try {
      // 로컬 state 즉시 업데이트 (낙관적 업데이트)
      setTestImageReactions((prev) => ({
        ...prev,
        [index]: reaction,
      }));

      // 서버에 업데이트 요청
      await updateTestImageMetadata(relativeUrl, { reaction });

      // 메타데이터 재로드 (서버 상태와 동기화)
      await loadTestImageMetadata();
    } catch (err: any) {
      console.error('반응 업데이트 오류:', err);
      alert(err.message || '반응 업데이트에 실패했습니다.');
      // 에러 발생 시 메타데이터 재로드로 원복
      await loadTestImageMetadata();
    }
  };

  /**
   * 메모 변경 핸들러 (debounce 적용)
   */
  const memoUpdateTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  const handleMemoInputChange = (index: number, value: string) => {
    // 로컬 state 즉시 업데이트
    setTestImageMemoInputs((prev) => ({
      ...prev,
      [index]: value,
    }));

    // 이전 타이머 취소
    if (memoUpdateTimeoutRef.current[index]) {
      clearTimeout(memoUpdateTimeoutRef.current[index]);
    }

    // 1초 후 서버에 업데이트 (debounce)
    memoUpdateTimeoutRef.current[index] = setTimeout(async () => {
      if (!material || !material.testImages || index >= material.testImages.length) {
        return;
      }

      const imageUrl = material.testImages[index];
      const relativeUrl = imageUrl.replace(/^https?:\/\/[^/]+/, '');

      try {
        await updateTestImageMetadata(relativeUrl, { memo: value || null });
        await loadTestImageMetadata();
      } catch (err: any) {
        console.error('메모 업데이트 오류:', err);
        // 메모 업데이트 실패는 조용히 처리 (사용자 경험)
        await loadTestImageMetadata();
      }
    }, 1000);
  };

  /**
   * 확인 토글 핸들러
   */
  const handleConfirmationToggle = async (index: number, isConfirmed: boolean) => {
    if (!material || !material.testImages || index >= material.testImages.length) {
      return;
    }

    const imageUrl = material.testImages[index];
    const relativeUrl = imageUrl.replace(/^https?:\/\/[^/]+/, '');

    try {
      // 로컬 state 즉시 업데이트 (낙관적 업데이트)
      if (isConfirmed) {
        setTestImageMemoConfirmations((prev) => {
          const updated = { ...prev };
          delete updated[index];
          return updated;
        });
      } else {
        setTestImageMemoConfirmations((prev) => ({
          ...prev,
          [index]: {
            confirmedBy: currentManagerName,
            confirmedAt: new Date().toISOString(),
          },
        }));
      }

      // 서버에 업데이트 요청
      await updateTestImageMetadata(relativeUrl, {
        confirmed: !isConfirmed, // isConfirmed가 true면 확인 취소, false면 확인 처리
        confirmedBy: !isConfirmed ? currentManagerName : undefined,
      });

      // 메타데이터 재로드
      await loadTestImageMetadata();
    } catch (err: any) {
      console.error('확인 상태 업데이트 오류:', err);
      alert(err.message || '확인 상태 업데이트에 실패했습니다.');
      // 에러 발생 시 메타데이터 재로드로 원복
      await loadTestImageMetadata();
    }
  };

  const handleOrderClick = (index: number) => {
    if (!material || !material.testImages || index >= material.testImages.length) {
      alert('이미지를 찾을 수 없습니다.');
      return;
    }

    const testImageUrl = material.testImages[index];
    if (!testImageUrl) {
      alert('이미지 URL을 찾을 수 없습니다.');
      return;
    }

    // 이미지 URL을 /uploads/로 시작하는 상대 경로로 변환
    // 서버에서 getMaterialImageFilePathFromUrl이 /uploads/를 기대하므로 상대 경로로 변환
    let relativeImageUrl = testImageUrl;
    if (testImageUrl.startsWith('http://') || testImageUrl.startsWith('https://')) {
      // 전체 URL인 경우 /uploads/ 부분만 추출
      const urlObj = new URL(testImageUrl);
      const pathname = urlObj.pathname;
      if (pathname.startsWith('/uploads/')) {
        relativeImageUrl = pathname;
      } else {
        // /uploads/가 없으면 그대로 사용 (에러 가능성 있음)
        relativeImageUrl = pathname;
      }
    } else if (!testImageUrl.startsWith('/uploads/')) {
      // 상대 경로이지만 /uploads/로 시작하지 않는 경우 추가
      relativeImageUrl = testImageUrl.startsWith('/') ? testImageUrl : `/${testImageUrl}`;
      if (!relativeImageUrl.startsWith('/uploads/')) {
        relativeImageUrl = `/uploads${relativeImageUrl}`;
      }
    }

    // 미리보기용 전체 URL 저장
    const fullImageUrlForPreview = relativeImageUrl.startsWith('http://') || relativeImageUrl.startsWith('https://')
      ? relativeImageUrl
      : `${SERVER_BASE_URL}${relativeImageUrl}`;

    // 서버에 전달할 상대 경로와 미리보기용 전체 URL을 저장
    // selectedTestImageUrl은 서버에 전달하므로 상대 경로로 저장
    setSelectedTestImageUrl(relativeImageUrl);
    setIsPurchaseOrderModalOpen(true);
  };

  const handlePurchaseOrderModalClose = () => {
    setIsPurchaseOrderModalOpen(false);
    setSelectedTestImageUrl(null);
  };

  const handlePurchaseOrderSave = async (formData: PurchaseOrderFormData, mainImageFile?: File) => {
    try {
      // 발주 생성 API 호출
      const finalProductName = formData.product_name || formData.product_name_chinese || '';
      const finalProductNameChinese = formData.product_name && formData.product_name_chinese ? formData.product_name_chinese : undefined;
      
      const createData: any = {
        product_name: finalProductName,
        product_name_chinese: finalProductNameChinese,
        product_category: formData.product_category || '봉제',
        product_size: formData.product_size || undefined,
        product_weight: formData.product_weight || undefined,
        product_set_count: formData.product_set_count || 1,
        unit_price: formData.unit_price,
        order_unit_price: formData.order_unit_price || undefined,
        quantity: formData.quantity,
        order_date: formData.order_date || null,
        estimated_shipment_date: formData.estimated_shipment_date || null,
        created_by: user?.id || undefined,
        testImageUrl: selectedTestImageUrl || undefined, // 부자재 테스트 이미지 URL 전달
      };

      const createResponse = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 생성에 실패했습니다.');
      }

      const createResult = await createResponse.json();
      const savedOrderId = createResult.data.id;

      // 성공 메시지
      alert('발주가 성공적으로 생성되었습니다.');
      
      // 모달 닫기
      setIsPurchaseOrderModalOpen(false);
      setSelectedTestImageUrl(null);
      
      // 발주 상세 페이지로 이동
      navigate(`/admin/purchase-orders/${savedOrderId}`);
    } catch (error: any) {
      console.error('발주 생성 오류:', error);
      alert(error.message || '발주 생성 중 오류가 발생했습니다.');
      throw error;
    }
  };

  // 입출고 기록 로드 함수 (useEffect 밖으로 분리)
  const loadInventoryTransactions = async () => {
    if (!id) return;

    setIsLoadingInventory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/materials/${id}/inventory`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '입출고 기록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // 서버 응답을 클라이언트 형식으로 변환
        const convertedRecords = data.data.map((t: any) => ({
          date: typeof t.transactionDate === 'string' 
            ? t.transactionDate.split('T')[0] 
            : t.transactionDate,
          incoming: t.transactionType === 'in' ? t.quantity : null,
          outgoing: t.transactionType === 'out' ? t.quantity : null,
          quantity: 0, // 클라이언트에서 계산
          relatedOrder: t.relatedOrder,
          id: t.id,
        }));
        
        // 수량 계산 (날짜순으로 정렬 후 누적)
        const sortedRecords = convertedRecords.sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        let runningTotal = material?.currentStock || 0;
        // 역순으로 계산 (가장 최근 기록부터 시작하여 현재 재고 기준으로 역산)
        for (let i = sortedRecords.length - 1; i >= 0; i--) {
          const record = sortedRecords[i];
          if (record.incoming) {
            runningTotal -= record.incoming;
          } else if (record.outgoing) {
            runningTotal += record.outgoing;
          }
        }
        
        // 정순으로 재계산
        sortedRecords.forEach((record: any) => {
          if (record.incoming) {
            runningTotal += record.incoming;
          } else if (record.outgoing) {
            runningTotal -= record.outgoing;
          }
          record.quantity = runningTotal;
        });
        
        // 다시 날짜 역순으로 정렬 (최신순 표시)
        setInventoryRecords(sortedRecords.reverse());
      }
    } catch (err: any) {
      console.error('입출고 기록 로드 오류:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // 입출고 기록 자동 로드 (탭이 inventory일 때만)
  useEffect(() => {
    if (activeTab === 'inventory' && id) {
      loadInventoryTransactions();
    }
  }, [id, activeTab]);

  const handleInventoryAdd = () => {
    // InventoryTab 컴포넌트 내부에서 처리
  };

  const handleInventorySave = async (transactionData: any) => {
    try {
      // 입고만 허용 (transactionType은 항상 'in')
      const response = await fetch(`${API_BASE_URL}/materials/${id}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          transactionDate: transactionData.date,
          transactionType: 'in', // 입고만 허용
          quantity: transactionData.incoming || transactionData.outgoing,
          relatedOrder: null, // 관련 발주는 비활성화
          notes: transactionData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '입출고 기록 추가에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success) {
        // 부자재 데이터 재로드하여 current_stock 업데이트
        await loadMaterial();
        
        // 입출고 기록 목록 재로드
        await loadInventoryTransactions();
      }
    } catch (error: any) {
      console.error('입출고 기록 추가 오류:', error);
      alert(error.message || '입출고 기록 추가 중 오류가 발생했습니다.');
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">부자재 정보를 불러오는 중...</p>
          <p className="text-sm text-gray-400">ID: {id || '없음'}</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '부자재를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/admin/materials')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  console.log('MaterialDetail - Rendering material detail');
  return (
    <>
      <div className="p-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/admin/materials')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>목록으로 돌아가기</span>
            </button>
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900 text-2xl font-semibold">부자재 상세 정보</h2>
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDirty && !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{isSaving ? '저장 중...' : '저장'}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <MaterialInfoTable material={material} onMaterialChange={setMaterial} />

            <MaterialTabs
              activeTab={activeTab}
              material={material}
              testImageReactions={testImageReactions}
              testImageMemoInputs={testImageMemoInputs}
              testImageMemoConfirmations={testImageMemoConfirmations}
              currentManagerName={currentManagerName}
              onTabChange={setActiveTab}
              onImageClick={setSelectedImage}
              onProductImageUploadClick={handleProductImageUpload}
              onTestImageUploadClick={handleTestImageUpload}
              onReactionChange={handleReactionChange}
              onMemoInputChange={handleMemoInputChange}
              onConfirmationToggle={handleConfirmationToggle}
              onOrderClick={handleOrderClick}
              onInventoryAddClick={handleInventoryAdd}
              inventoryRecords={inventoryRecords}
              isLoadingInventory={isLoadingInventory}
              onInventorySave={handleInventorySave}
            />
          </div>
        </div>
      </div>

      {/* 클릭 시 단일 이미지 모달 */}
      {selectedImage && (
        <GalleryImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}

      {/* 발주 생성 모달 */}
      {isPurchaseOrderModalOpen && selectedTestImageUrl && (
        <PurchaseOrderForm
          onClose={handlePurchaseOrderModalClose}
          onSave={handlePurchaseOrderSave}
          initialMainImageUrl={
            selectedTestImageUrl.startsWith('http://') || selectedTestImageUrl.startsWith('https://')
              ? selectedTestImageUrl
              : `${SERVER_BASE_URL}${selectedTestImageUrl}`
          }
        />
      )}
    </>
  );
}
