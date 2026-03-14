import { Plus } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';

export interface InvoiceFormValue {
  date: string;
  productName: string;
  invoiceFile: File | null;
  photoFiles: File[];
}

export interface InvoiceUploadFormProps {
  value: InvoiceFormValue;
  onChange: (value: InvoiceFormValue) => void;
  onAdd: () => void;
  disabled?: boolean;
}

export function InvoiceUploadForm({ value, onChange, onAdd, disabled }: InvoiceUploadFormProps) {
  const canAdd = value.date.trim() && value.productName.trim();

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex flex-col min-w-[100px]">
        <span className="text-xs font-medium text-gray-600 mb-1">날짜</span>
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          disabled={disabled}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="flex flex-col min-w-[120px] flex-1">
        <span className="text-xs font-medium text-gray-600 mb-1">제품명</span>
        <input
          type="text"
          value={value.productName}
          onChange={(e) => onChange({ ...value, productName: e.target.value })}
          placeholder="제품명 입력"
          disabled={disabled}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
      <FileUploadZone
        label="인보이스"
        accept=".pdf,.xlsx,.xls,.csv,image/*"
        files={value.invoiceFile ? [value.invoiceFile] : []}
        onChange={(files) => onChange({ ...value, invoiceFile: files[0] ?? null })}
        disabled={disabled}
        compact
        placeholder="인보이스 파일"
      />
      <FileUploadZone
        label="사진자료 업로드"
        multiple
        files={value.photoFiles}
        onChange={(files) => onChange({ ...value, photoFiles: files })}
        disabled={disabled}
        compact
        placeholder="사진자료 업로드"
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || !canAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <Plus className="w-4 h-4" />
        추가
      </button>
    </div>
  );
}
