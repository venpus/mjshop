import { useState } from 'react';
import { X } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';

export interface ReUploadModalProps {
  title: string;
  currentInvoiceName: string;
  currentPhotoNames: string[];
  onConfirm: (invoiceFile: File | null, photoFiles: File[]) => void;
  onClose: () => void;
}

export function ReUploadModal({
  title,
  currentInvoiceName,
  currentPhotoNames,
  onConfirm,
  onClose,
}: ReUploadModalProps) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const handleConfirm = () => {
    onConfirm(invoiceFile, photoFiles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            현재: 인보이스 <span className="font-medium">{currentInvoiceName || '-'}</span>
            {currentPhotoNames.length ? ` / 사진자료 ${currentPhotoNames.length}개` : ''}
          </p>
          <FileUploadZone
            label="인보이스 파일 (변경 시 선택)"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            files={invoiceFile ? [invoiceFile] : []}
            onChange={(files) => setInvoiceFile(files[0] ?? null)}
            placeholder="파일 선택"
          />
          <FileUploadZone
            label="사진자료 (변경 시 선택)"
            multiple
            files={photoFiles}
            onChange={setPhotoFiles}
            placeholder="사진자료 업로드"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
