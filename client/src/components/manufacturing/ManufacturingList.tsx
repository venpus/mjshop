import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import {
  listManufacturingDocuments,
  uploadManufacturingDocument,
  downloadManufacturingDocument,
  deleteManufacturingDocument,
} from '../../api/manufacturingApi';
import type { ManufacturingDocument } from '../../types/manufacturing';

const ACCEPT = '.xlsx,.xls,.pdf';

export function ManufacturingList() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const purchaseOrderIdFilter = searchParams.get('purchaseOrderId') || undefined;

  const [list, setList] = useState<ManufacturingDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState(purchaseOrderIdFilter || '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listManufacturingDocuments({
        purchaseOrderId: purchaseOrderIdFilter || undefined,
        limit: 200,
      });
      setList(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (purchaseOrderIdFilter) setPurchaseOrderId(purchaseOrderIdFilter);
  }, [purchaseOrderIdFilter]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      await uploadManufacturingDocument(file, purchaseOrderId || null);
      await load();
      e.target.value = '';
    } catch (err: any) {
      setUploadError(err?.message || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: ManufacturingDocument) => {
    try {
      await downloadManufacturingDocument(doc.id, doc.original_file_name || undefined);
    } catch (err: any) {
      alert(err?.message || '다운로드에 실패했습니다.');
    }
  };

  const handleDelete = async (doc: ManufacturingDocument) => {
    if (!confirm(t('manufacturing.deleteConfirm') || '이 제조 문서를 삭제하시겠습니까?')) return;
    try {
      await deleteManufacturingDocument(doc.id);
      await load();
    } catch (err: any) {
      alert(err?.message || '삭제에 실패했습니다.');
    }
  };

  const formatDate = (s: string | undefined) => {
    if (!s) return '-';
    try {
      const d = new Date(s);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return s;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t('manufacturing.listTitle')}</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-600 mb-2">{t('manufacturing.uploadHint')}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('manufacturing.purchaseOrderIdOptional')}</label>
            <input
              type="text"
              value={purchaseOrderId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
              placeholder="PO001"
              className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer disabled:opacity-50 text-sm">
            <Upload className="w-4 h-4" />
            {uploading ? t('common.loading') : t('manufacturing.upload')}
            <input
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">{t('common.loading')}</div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-gray-500">{t('manufacturing.noDocuments')}</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-700">{t('manufacturing.fileName')}</th>
                <th className="px-3 py-2 font-medium text-gray-700">{t('manufacturing.purchaseOrderId')}</th>
                <th className="px-3 py-2 font-medium text-gray-700">{t('manufacturing.uploadedAt')}</th>
                <th className="px-3 py-2 font-medium text-gray-700 w-24">{t('manufacturing.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{doc.original_file_name || '-'}</td>
                  <td className="px-3 py-2">{doc.purchase_order_id || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(doc.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
