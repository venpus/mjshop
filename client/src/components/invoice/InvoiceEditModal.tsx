import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import type { InvoiceEntry } from './types';

export interface InvoiceEditModalProps {
  entry: InvoiceEntry;
  onConfirm: (id: string, data: { date: string; productName: string; invoiceFile: File | null; photoFiles: File[] }) => void;
  onClose: () => void;
}

export function InvoiceEditModal({ entry, onConfirm, onClose }: InvoiceEditModalProps) {
  const [date, setDate] = useState(entry.date);
  const [productName, setProductName] = useState(entry.productName);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(entry.invoiceFile);
  const [photoFiles, setPhotoFiles] = useState<File[]>(entry.photoFiles);

  useEffect(() => {
    setDate(entry.date);
    setProductName(entry.productName);
    setInvoiceFile(entry.invoiceFile);
    setPhotoFiles(entry.photoFiles);
  }, [entry]);

  const handleConfirm = () => {
    onConfirm(entry.id, { date, productName: productName.trim(), invoiceFile, photoFiles });
    onClose();
  };

  const valid = date.trim() && productName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">수정</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs font-medium text-gray-600 mb-1 block">날짜</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded"
            />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600 mb-1 block">제품명</span>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="제품명"
              className="w-full px-2 py-1.5 border border-gray-300 rounded"
            />
          </div>
          <FileUploadZone
            label="인보이스 파일"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            files={invoiceFile ? [invoiceFile] : []}
            onChange={(files) => setInvoiceFile(files[0] ?? null)}
            placeholder="파일 선택"
          />
          <FileUploadZone
            label="사진자료 업로드"
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
            disabled={!valid}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
