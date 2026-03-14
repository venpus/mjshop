import { Pencil, Trash2, Upload } from 'lucide-react';
import type { InvoiceEntry } from './types';

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

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{entry.date}</td>
      <td className="px-3 py-2 text-sm text-gray-700 min-w-[120px]">{entry.productName}</td>
      <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-[180px]" title={invoiceName}>
        {invoiceName}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-[200px]" title={photoNames}>
        {photoNames}
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
