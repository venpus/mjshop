export interface NormalInvoiceEntry {
  id: number;
  entry_date: string; // YYYY-MM-DD
  product_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface NormalInvoiceFile {
  id: number;
  entry_id: number;
  file_kind: 'invoice' | 'photo';
  file_path: string;
  original_name: string;
  display_order: number;
  created_at: Date;
}

export interface NormalInvoiceEntryWithFiles extends NormalInvoiceEntry {
  invoice_file: { file_path: string; original_name: string } | null;
  photo_files: { file_path: string; original_name: string }[];
}

export interface CreateNormalInvoiceEntryDTO {
  entry_date: string;
  product_name: string;
}

export interface UpdateNormalInvoiceEntryDTO {
  entry_date?: string;
  product_name?: string;
}
