export interface ManufacturingProcessStepImage {
  id: number;
  manufacturing_process_step_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

export interface ManufacturingProcessStep {
  id: number;
  manufacturing_document_id: string;
  display_order: number;
  process_name: string;
  process_name_zh: string | null;
  work_method: string | null;
  work_method_zh: string | null;
  created_at: Date;
  updated_at: Date;
  images?: ManufacturingProcessStepImage[];
}

export type TranslationStatus = 'idle' | 'pending' | 'translating' | 'completed' | 'failed';

export interface ManufacturingDocument {
  id: string;
  purchase_order_id: string | null;
  product_name: string;
  product_name_zh: string | null;
  product_image: string | null;
  quantity: number;
  finished_product_image: string | null;
  small_pack_count: number | null;
  quantity_per_box: number | null;
  packing_list_code: string | null;
  barcode: string | null;
  document_file_path?: string | null;
  original_file_name?: string | null;
  translation_status?: TranslationStatus;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  steps?: ManufacturingProcessStep[];
}

export interface CreateManufacturingDocumentDTO {
  purchase_order_id?: string | null;
  product_name: string;
  product_name_zh?: string | null;
  product_image?: string | null;
  quantity: number;
  finished_product_image?: string | null;
  small_pack_count?: number | null;
  quantity_per_box?: number | null;
  packing_list_code?: string | null;
  barcode?: string | null;
  steps?: CreateManufacturingStepDTO[];
}

export interface CreateManufacturingStepDTO {
  display_order: number;
  process_name: string;
  process_name_zh?: string | null;
  work_method?: string | null;
  work_method_zh?: string | null;
  image_urls?: string[];
}

export interface UpdateManufacturingDocumentDTO {
  product_name?: string;
  product_name_zh?: string | null;
  product_image?: string | null;
  quantity?: number;
  finished_product_image?: string | null;
  small_pack_count?: number | null;
  quantity_per_box?: number | null;
  packing_list_code?: string | null;
  barcode?: string | null;
  steps?: CreateManufacturingStepDTO[];
}
