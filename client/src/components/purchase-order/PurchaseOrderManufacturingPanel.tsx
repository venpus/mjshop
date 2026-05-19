import { Upload, Download, Trash2, Wrench, FileEdit } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePurchaseOrderManufacturingFiles } from '../../hooks/usePurchaseOrderManufacturingFiles';
import type { ManufacturingDocument } from '../../types/manufacturing';

interface PurchaseOrderManufacturingPanelProps {
  purchaseOrderId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  poNumber?: string;
}

export function PurchaseOrderManufacturingPanel({
  purchaseOrderId,
  productName,
  productImage,
  quantity,
  poNumber,
}: PurchaseOrderManufacturingPanelProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { docs, loading, uploading, upload, download, remove } =
    usePurchaseOrderManufacturingFiles(purchaseOrderId);

  const handleWriteClick = () => {
    const returnTo = `${location.pathname}${location.search}`;
    const params = new URLSearchParams();
    params.set('returnTo', returnTo);
    navigate(`/admin/manufacturing/purchase-order/${purchaseOrderId}?${params.toString()}`, {
      state: { productName, productImage, quantity, poNumber },
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '업로드에 실패했습니다.';
      alert(message);
    } finally {
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: ManufacturingDocument) => {
    try {
      await download(doc);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '다운로드에 실패했습니다.';
      alert(message);
    }
  };

  const handleDelete = async (doc: ManufacturingDocument) => {
    if (!confirm(t('manufacturing.deleteConfirm') || '이 제조 문서를 삭제하시겠습니까?')) return;
    try {
      await remove(doc);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '삭제에 실패했습니다.';
      alert(message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          {t('manufacturing.title')}
        </h3>
        <button
          type="button"
          onClick={handleWriteClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <FileEdit className="w-3.5 h-3.5" />
          {t('purchaseOrder.detail.manufacturingWrite')}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">{t('manufacturing.uploadHint')}</p>
      <label className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 text-amber-800 text-sm mb-3 disabled:opacity-50">
        <Upload className="w-4 h-4" />
        {uploading ? t('common.loading') : t('manufacturing.upload')}
        <input
          type="file"
          accept=".xlsx,.xls,.pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {loading ? (
        <div className="text-xs text-gray-500 py-2">{t('common.loading')}</div>
      ) : docs.length === 0 ? (
        <div className="text-xs text-gray-500 py-2">{t('manufacturing.noDocuments')}</div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
            >
              <span
                className="text-sm text-gray-800 truncate flex-1 min-w-0"
                title={doc.original_file_name || undefined}
              >
                {doc.original_file_name || t('manufacturing.title')}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {doc.document_file_path && (
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                    title={t('manufacturing.download')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
