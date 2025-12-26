import { useEffect, useRef } from 'react';

interface PackingListItem {
  id: string;
  shippingDate: string; // 발송일
  code: string; // 코드
  productName: string; // 제품명
  productImage?: string; // 제품사진
  quantityPerBox: number; // 입수량
  boxCount: number; // 박스수
  unit: string; // 단위
  totalQuantity: number; // 총수량
  inlandTrackingNumber: string; // 내륙송장
  logisticsCompany: string; // 물류회사
  warehouseArrivalDate?: string; // 물류창고 도착일
  koreaArrivalDate?: string; // 한국도착일
  weight: number; // 중량
  shippingCost: number; // 배송비
  paymentDate?: string; // 지급일
  wkPaymentDate?: string; // WK결제일
}

// Dummy Data
const dummyData: PackingListItem[] = [
  {
    id: '1',
    shippingDate: '2024-12-01',
    code: 'CODE001',
    productName: '봉제인형 A',
    productImage: '',
    quantityPerBox: 10,
    boxCount: 30,
    unit: '개',
    totalQuantity: 300,
    inlandTrackingNumber: 'CN-TRK-001',
    logisticsCompany: '顺丰',
    warehouseArrivalDate: '2024-12-05',
    koreaArrivalDate: '2024-12-15',
    weight: 3000,
    shippingCost: 120000,
    paymentDate: '2024-12-20',
    wkPaymentDate: '2024-12-25',
  },
  {
    id: '2',
    shippingDate: '2024-12-01',
    code: 'CODE001',
    productName: '봉제인형 B',
    productImage: '',
    quantityPerBox: 10,
    boxCount: 20,
    unit: '개',
    totalQuantity: 200,
    inlandTrackingNumber: 'CN-TRK-001',
    logisticsCompany: '顺丰',
    warehouseArrivalDate: '2024-12-05',
    koreaArrivalDate: '2024-12-15',
    weight: 2000,
    shippingCost: 120000,
    paymentDate: '2024-12-20',
    wkPaymentDate: '2024-12-25',
  },
  {
    id: '3',
    shippingDate: '2024-12-02',
    code: 'CODE002',
    productName: '피규어 A',
    productImage: '',
    quantityPerBox: 5,
    boxCount: 50,
    unit: '개',
    totalQuantity: 250,
    inlandTrackingNumber: 'CN-TRK-002',
    logisticsCompany: '中通',
    warehouseArrivalDate: '2024-12-06',
    koreaArrivalDate: '2024-12-16',
    weight: 4000,
    shippingCost: 180000,
    paymentDate: '2024-12-21',
    wkPaymentDate: '2024-12-26',
  },
];

export function ShippingHistory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const luckysheetInitialized = useRef(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // 데이터를 Luckysheet 형식으로 변환
  const convertToLuckysheetData = (data: PackingListItem[]) => {
    // 헤더 정의
    const headers = [
      '발송일',
      '코드',
      '제품명',
      '제품사진',
      '입수량',
      '박스수',
      '단위',
      '총수량',
      '내륙송장',
      '물류회사',
      '물류창고 도착일',
      '한국도착일',
      '중량',
      '배송비',
      '지급일',
      'WK결제일',
    ];

    // 헤더 행 생성
    const headerRow: any[] = headers.map((header, index) => ({
      v: header,
      ct: { fa: 'General', t: 'g' },
      m: header,
      bg: '#f0f0f0',
      bl: 1,
      it: 0,
      fs: 12,
      fc: '#000000',
      ht: 1,
      vt: 1,
      mc: { r: 0, c: index, rs: 1, cs: 1 },
    }));

    // 데이터 행 생성
    const dataRows: any[][] = data.map((item) => [
      {
        v: item.shippingDate || '',
        ct: { fa: 'yyyy-mm-dd', t: 'd' },
        m: item.shippingDate || '',
      },
      {
        v: item.code || '',
        ct: { fa: 'General', t: 'g' },
        m: item.code || '',
      },
      {
        v: item.productName || '',
        ct: { fa: 'General', t: 'g' },
        m: item.productName || '',
      },
      {
        v: item.productImage || '',
        ct: { fa: 'General', t: 'g' },
        m: item.productImage || '',
      },
      {
        v: item.quantityPerBox || 0,
        ct: { fa: 'General', t: 'n' },
        m: String(item.quantityPerBox || 0),
      },
      {
        v: item.boxCount || 0,
        ct: { fa: 'General', t: 'n' },
        m: String(item.boxCount || 0),
      },
      {
        v: item.unit || '',
        ct: { fa: 'General', t: 'g' },
        m: item.unit || '',
      },
      {
        v: item.totalQuantity || 0,
        ct: { fa: 'General', t: 'n' },
        m: String(item.totalQuantity || 0),
      },
      {
        v: item.inlandTrackingNumber || '',
        ct: { fa: 'General', t: 'g' },
        m: item.inlandTrackingNumber || '',
      },
      {
        v: item.logisticsCompany || '',
        ct: { fa: 'General', t: 'g' },
        m: item.logisticsCompany || '',
      },
      {
        v: item.warehouseArrivalDate || '',
        ct: { fa: 'yyyy-mm-dd', t: 'd' },
        m: item.warehouseArrivalDate || '',
      },
      {
        v: item.koreaArrivalDate || '',
        ct: { fa: 'yyyy-mm-dd', t: 'd' },
        m: item.koreaArrivalDate || '',
      },
      {
        v: item.weight || 0,
        ct: { fa: '#,##0"g"', t: 'n' },
        m: String(item.weight || 0),
      },
      {
        v: item.shippingCost || 0,
        ct: { fa: '¥#,##0', t: 'n' },
        m: String(item.shippingCost || 0),
      },
      {
        v: item.paymentDate || '',
        ct: { fa: 'yyyy-mm-dd', t: 'd' },
        m: item.paymentDate || '',
      },
      {
        v: item.wkPaymentDate || '',
        ct: { fa: 'yyyy-mm-dd', t: 'd' },
        m: item.wkPaymentDate || '',
      },
    ]);

    // 셀 병합 처리 (코드 열 기준)
    const mergedCells: any[] = [];
    const codeColumnIndex = 1; // 코드 열 인덱스

    // 코드별로 그룹화
    const codeGroups: { [key: string]: number[] } = {};
    data.forEach((item, index) => {
      if (!codeGroups[item.code]) {
        codeGroups[item.code] = [];
      }
      codeGroups[item.code].push(index + 1); // +1은 헤더 행 때문
    });

    // 병합 셀 추가
    Object.values(codeGroups).forEach((rowIndices) => {
      if (rowIndices.length > 1) {
        const startRow = rowIndices[0];
        const endRow = rowIndices[rowIndices.length - 1];
        mergedCells.push({
          r: startRow,
          c: codeColumnIndex,
          rs: rowIndices.length,
          cs: 1,
        });
      }
    });

    // 모든 행 합치기
    const celldata: any[][] = [headerRow, ...dataRows];

    return {
      name: '패킹리스트',
      index: 0,
      order: 0,
      status: 1,
      celldata: celldata,
      config: {
        merge: mergedCells,
        borderInfo: [],
        rowlen: {},
        columnlen: {},
        rowhidden: {},
        colhidden: {},
        customHeight: {},
        customWidth: {},
      },
      scrollLeft: 0,
      scrollTop: 0,
      luckysheet_select_save: [],
      calcChain: [],
      isPivotTable: false,
      pivotTable: {},
      filter_select: {},
      filter: null,
      luckysheet_conditionformat_save: [],
      frozen: {},
      chart: [],
      zoomRatio: 1,
      image: [],
      showGridLines: 1,
      dataVerification: {},
    };
  };

  // Luckysheet 초기화
  useEffect(() => {
    if (!containerRef.current || luckysheetInitialized.current) {
      return;
    }

    // Luckysheet 스크립트 및 스타일 동적 로드
    const loadLuckysheet = async () => {
      try {
        // CSS 로드
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css';
        document.head.appendChild(link);

        const link2 = document.createElement('link');
        link2.rel = 'stylesheet';
        link2.href = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css';
        document.head.appendChild(link2);

        const link3 = document.createElement('link');
        link3.rel = 'stylesheet';
        link3.href = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css';
        document.head.appendChild(link3);

        // JavaScript 로드
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js';
        script.async = true;

        script.onload = () => {
          const script2 = document.createElement('script');
          script2.src = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js';
          script2.async = true;

          script2.onload = () => {
            // @ts-ignore
            if (window.luckysheet) {
              // 데이터 변환
              const sheetData = convertToLuckysheetData(dummyData);

              // Luckysheet 초기화
              // @ts-ignore
              window.luckysheet.create({
                container: 'luckysheet',
                lang: 'ko',
                allowCopy: true,
                allowEdit: true,
                enableAddRow: true,
                enableAddCol: true,
                showtoolbar: true,
                showinfobar: false,
                showsheetbar: true,
                showstatisticBar: true,
                enableAddBackTop: true,
                data: [sheetData],
                title: '패킹리스트',
                userInfo: false,
                myFolderUrl: '',
              });

              luckysheetInitialized.current = true;
            }
          };

          document.body.appendChild(script2);
        };

        document.body.appendChild(script);
      } catch (error) {
        console.error('Luckysheet 로드 실패:', error);
      }
    };

    loadLuckysheet();

    // 클린업 함수
    return () => {
      // @ts-ignore
      if (window.luckysheet && luckysheetInitialized.current) {
        try {
          // @ts-ignore
          window.luckysheet.destroy();
          luckysheetInitialized.current = false;
        } catch (error) {
          console.error('Luckysheet 정리 실패:', error);
        }
      }
    };
  }, []);

  // 데이터 저장 함수
  const handleSave = async () => {
    try {
      // @ts-ignore
      if (!window.luckysheet) {
        alert('Luckysheet가 아직 로드되지 않았습니다.');
        return;
      }

      // @ts-ignore
      const allSheets = window.luckysheet.getAllSheets();
      const sheetData = allSheets[0]; // 첫 번째 시트 데이터

      // API로 저장
      const response = await fetch(`${API_BASE_URL}/packing-list/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          data: sheetData,
        }),
      });

      if (!response.ok) {
        throw new Error('저장에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success) {
        alert('저장되었습니다.');
      } else {
        throw new Error(result.error || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      alert(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 데이터 로드 함수
  const handleLoad = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/packing-list/load`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('데이터 로드에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success && result.data) {
        // @ts-ignore
        if (window.luckysheet) {
          // @ts-ignore
          window.luckysheet.destroy();
          luckysheetInitialized.current = false;

          // 새로운 데이터로 재초기화
          // @ts-ignore
          window.luckysheet.create({
            container: 'luckysheet',
            lang: 'ko',
            allowCopy: true,
            allowEdit: true,
            enableAddRow: true,
            enableAddCol: true,
            showtoolbar: true,
            showinfobar: false,
            showsheetbar: true,
            showstatisticBar: true,
            enableAddBackTop: true,
            data: [result.data],
            title: '패킹리스트',
            userInfo: false,
            myFolderUrl: '',
          });

          luckysheetInitialized.current = true;
          alert('데이터를 불러왔습니다.');
        }
      }
    } catch (error: any) {
      console.error('로드 오류:', error);
      alert(error.message || '데이터 로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-white">
      {/* 헤더 영역 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-gray-900 mb-2">패킹리스트</h2>
            <p className="text-gray-600">발송된 상품의 패킹 정보를 확인하고 편집할 수 있습니다</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLoad}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              불러오기
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              저장하기
            </button>
          </div>
        </div>
      </div>

      {/* Luckysheet 컨테이너 */}
      <div className="flex-1 relative" style={{ minHeight: '600px' }}>
        <div
          id="luckysheet"
          ref={containerRef}
          style={{
            margin: '0px',
            padding: '0px',
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: '0px',
            top: '0px',
          }}
        />
      </div>
    </div>
  );
}
