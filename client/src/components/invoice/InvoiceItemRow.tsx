import { Pencil, Trash2, Upload } from 'lucide-react';
import type { InvoiceEntry } from './types';
import { FileDownloadIconButton } from './FileDownloadIconButton';
import { downloadNormalInvoiceInvoiceFile, downloadNormalInvoicePhotoFile } from '../../api/normalInvoiceApi';

export interface InvoiceItemRowProps {
  entry: InvoiceEntry;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReUpload: (id: string) => void;
}

export function InvoiceItemRow({ entry, onEdit, onDelete, onReUpload }: InvoiceItemRowProps) {
  const invoiceName =
    entry.invoiceFile?.name ?? entry.invoiceFileName ?? '-';
  const photoNames =
    entry.photoFiles.length > 0
      ? entry.photoFiles.map((f) => f.name).join(', ')
      : (entry.photoFileNames?.length
          ? entry.photoFileNames.join(', ')
          : '-');

  const entryNumId = Number(entry.id);
  const canDownloadInvoice =
    entry.hasServerInvoice === true && !Number.isNaN(entryNumId);
  const photoDownloads = entry.serverPhotoFiles ?? [];

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{entry.date}</td>
      <td className="px-3 py-2 text-sm text-gray-700 min-w-[120px]">{entry.productName}</td>
      <td className="px-3 py-2 text-sm text-gray-600 max-w-[220px]">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate flex-1 min-w-0" title={invoiceName}>
            {invoiceName}
          </span>
          {canDownloadInvoice && (
            <FileDownloadIconButton
              fileLabel={invoiceName}
              onDownload={() => downloadNormalInvoiceInvoiceFile(entryNumId)}
            />
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 max-w-[260px]">
        {photoDownloads.length > 0 ? (
          <ul className="space-y-1">
            {photoDownloads.map((p) => (
              <li key={p.id} className="flex items-center gap-1 min-w-0">
                <span className="truncate flex-1 min-w-0" title={p.original_name}>
                  {p.original_name}
                </span>
                <FileDownloadIconButton
                  fileLabel={p.original_name}
                  onDownload={() => downloadNormalInvoicePhotoFile(entryNumId, p.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <span className="truncate block max-w-[240px]" title={photoNames}>
            {photoNames}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => onEdit(entry.id)}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="수정"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onReUpload(entry.id)}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
          title="새로 업로드"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
