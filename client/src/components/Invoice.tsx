import { useCallback, useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { InvoiceUploadForm, type InvoiceFormValue } from './invoice/InvoiceUploadForm';
import { InvoiceItemList } from './invoice/InvoiceItemList';
import { InvoiceEditModal } from './invoice/InvoiceEditModal';
import { ReUploadModal } from './invoice/ReUploadModal';
import type { InvoiceEntry } from './invoice/types';
import {
  fetchNormalInvoices,
  createNormalInvoice,
  updateNormalInvoice,
  deleteNormalInvoice,
  type NormalInvoiceEntryResponse,
} from '../api/normalInvoiceApi';

const DEFAULT_ITEMS_PER_PAGE = 15;

function apiToEntry(e: NormalInvoiceEntryResponse): InvoiceEntry {
  return {
    id: String(e.id),
    date: e.entry_date,
    productName: e.product_name,
    invoiceFile: null,
    photoFiles: [],
    invoiceFileName: e.invoice_file?.original_name,
    photoFileNames: e.photo_files.map((p) => p.original_name),
  };
}

function buildFormData(params: {
  date: string;
  productName: string;
  invoiceFile?: File | null;
  photoFiles?: File[];
}): FormData {
  const form = new FormData();
  form.append('entry_date', params.date);
  form.append('product_name', params.productName);
  if (params.invoiceFile) {
    form.append('invoice', params.invoiceFile);
    form.append('invoice_original_name', params.invoiceFile.name);
  }
  const photos = params.photoFiles ?? [];
  photos.forEach((f) => form.append('photos', f));
  if (photos.length > 0) {
    form.append('photo_original_names', JSON.stringify(photos.map((f) => f.name)));
  }
  return form;
}

const emptyFormValue: InvoiceFormValue = {
  date: '',
  productName: '',
  invoiceFile: null,
  photoFiles: [],
};

export function Invoice() {
  const [formValue, setFormValue] = useState<InvoiceFormValue>(emptyFormValue);
  const [entries, setEntries] = useState<InvoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [editId, setEditId] = useState<string | null>(null);
  const [reUploadId, setReUploadId] = useState<string | null>(null);

  const totalItems = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNormalInvoices()
      .then((data) => {
        if (!cancelled) setEntries(data.map(apiToEntry));
      })
      .catch((err) => {
        if (!cancelled) alert(err instanceof Error ? err.message : '목록을 불러올 수 없습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (totalItems > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalItems, totalPages, currentPage]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return entries.slice(start, start + itemsPerPage);
  }, [entries, currentPage, itemsPerPage]);

  const handleAdd = useCallback(async () => {
    if (!formValue.date.trim() || !formValue.productName.trim()) return;
    const form = buildFormData({
      date: formValue.date,
      productName: formValue.productName.trim(),
      invoiceFile: formValue.invoiceFile,
      photoFiles: formValue.photoFiles,
    });
    try {
      const created = await createNormalInvoice(form);
      setEntries((prev) => [apiToEntry(created), ...prev]);
      setFormValue(emptyFormValue);
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    }
  }, [formValue]);

  const handleDelete = useCallback(async (id: string) => {
    const numId = Number(id);
    if (Number.isNaN(numId)) return;
    try {
      await deleteNormalInvoice(numId);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  }, []);

  const handleEditConfirm = useCallback(
    async (
      id: string,
      data: { date: string; productName: string; invoiceFile: File | null; photoFiles: File[] }
    ) => {
      const numId = Number(id);
      if (Number.isNaN(numId)) return;
      const form = buildFormData({
        date: data.date,
        productName: data.productName,
        invoiceFile: data.invoiceFile,
        photoFiles: data.photoFiles,
      });
      try {
        const updated = await updateNormalInvoice(numId, form);
        setEntries((prev) => prev.map((e) => (e.id !== id ? e : apiToEntry(updated))));
        setEditId(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
      }
    },
    []
  );

  const handleReUploadConfirm = useCallback(
    async (id: string, invoiceFile: File | null, photoFiles: File[]) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      const numId = Number(id);
      if (Number.isNaN(numId)) return;
      const form = buildFormData({
        date: entry.date,
        productName: entry.productName,
        invoiceFile: invoiceFile ?? undefined,
        photoFiles,
      });
      try {
        const updated = await updateNormalInvoice(numId, form);
        setEntries((prev) => prev.map((e) => (e.id !== id ? e : apiToEntry(updated))));
        setReUploadId(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : '파일 적용에 실패했습니다.');
      }
    },
    [entries]
  );

  const editEntry = editId ? entries.find((e) => e.id === editId) : null;
  const reUploadEntry = reUploadId ? entries.find((e) => e.id === reUploadId) : null;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">정상 인보이스</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            인보이스와 자료 파일을 업로드하고 관리합니다.
          </p>
        </div>

        <div className="space-y-4">
          <InvoiceUploadForm
            value={formValue}
            onChange={setFormValue}
            onAdd={handleAdd}
          />
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">로딩 중...</div>
          ) : (
            <InvoiceItemList
              entries={paginatedEntries}
              totalItems={totalItems}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              onEdit={setEditId}
              onDelete={handleDelete}
              onReUpload={setReUploadId}
            />
          )}
        </div>
      </div>

      {editEntry && (
        <InvoiceEditModal
          entry={editEntry}
          onConfirm={handleEditConfirm}
          onClose={() => setEditId(null)}
        />
      )}

      {reUploadEntry && (
        <ReUploadModal
          title="새로 업로드"
          currentInvoiceName={
            reUploadEntry.invoiceFile?.name ?? reUploadEntry.invoiceFileName ?? ''
          }
          currentPhotoNames={
            reUploadEntry.photoFiles.length > 0
              ? reUploadEntry.photoFiles.map((f) => f.name)
              : reUploadEntry.photoFileNames ?? []
          }
          onConfirm={(invoiceFile, photoFiles) =>
            handleReUploadConfirm(reUploadEntry.id, invoiceFile, photoFiles)
          }
          onClose={() => setReUploadId(null)}
        />
      )}
    </div>
  );
}
