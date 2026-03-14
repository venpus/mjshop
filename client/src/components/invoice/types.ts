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
}
