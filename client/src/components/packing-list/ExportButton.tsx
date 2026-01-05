import { useState } from 'react';
import { Download } from 'lucide-react';
import type { PackingListItem } from './types';
import { 
  transformToExcelData, 
  fetchPurchaseOrderNumbers, 
  createExcelFile 
} from '../../utils/packingListExport';

interface ExportButtonProps {
  selectedKeys: Set<string>;
  packingListItems: PackingListItem[];
  disabled?: boolean;
}

export function ExportButton({ 
  selectedKeys, 
  packingListItems,
  disabled = false 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (selectedKeys.size === 0) {
      alert('내보낼 패킹리스트를 선택해주세요.');
      return;
    }

    if (!confirm(`${selectedKeys.size}개의 패킹리스트를 엑셀로 내보내시겠습니까?`)) {
      return;
    }

    setIsExporting(true);

    try {
      // 1. 데이터 변환
      const codeGroups = transformToExcelData(selectedKeys, packingListItems);
      
      if (codeGroups.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
      }

      // 2. 발주코드 조회
      const poNumberMap = await fetchPurchaseOrderNumbers(codeGroups);

      // 3. 엑셀 파일 생성 및 다운로드
      await createExcelFile(codeGroups, poNumberMap);

      alert('엑셀 파일이 다운로드되었습니다.');
    } catch (error: any) {
      console.error('엑셀 내보내기 오류:', error);
      alert(error.message || '엑셀 내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting || selectedKeys.size === 0}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        disabled || isExporting || selectedKeys.size === 0
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
      title={selectedKeys.size === 0 ? '패킹리스트를 선택해주세요' : '엑셀로 내보내기'}
    >
      <Download className="w-4 h-4" />
      {isExporting ? '내보내는 중...' : '엑셀 내보내기'}
    </button>
  );
}

