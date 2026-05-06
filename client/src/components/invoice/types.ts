export interface InvoiceEntry {
  id: string;
  date: string;
  productName: string;
  invoiceFile: File | null;
  photoFiles: File[];
  /** 서버에서 불러온 경우 인보이스 파일명 */
  invoiceFileName?: string;
  /** 서버에서 불러온 경우 사진자료 파일명 목록 */
  photoFileNames?: string[];
  /** 서버에 인보이스 파일이 저장되어 있으면 다운로드 가능 */
  hasServerInvoice?: boolean;
  /** 서버 사진 파일별 id·이름(다운로드용) */
  serverPhotoFiles?: { id: number; original_name: string }[];
}
