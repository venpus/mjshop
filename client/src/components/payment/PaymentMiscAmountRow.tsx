import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, FileText, X } from 'lucide-react';
import type { PaymentMiscEntry } from '../../api/paymentMiscEntriesApi';
import { getMiscEntryFileUrl } from '../../api/paymentMiscEntriesApi';
import { formatDateForInput } from '../../utils/dateUtils';

function todayYmdLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface PaymentMiscAmountRowProps {
  entry: PaymentMiscEntry;
  labels: {
    date: string;
    description: string;
    amount: string;
    completed: string;
    file: string;
    delete: string;
    yuan: string;
  };
  onPatch: (id: number, body: Partial<PaymentMiscEntry>) => Promise<PaymentMiscEntry>;
  onDelete: (id: number) => Promise<void>;
  onUploadFile: (id: number, file: File) => Promise<PaymentMiscEntry>;
  onRemoveFile: (id: number) => Promise<PaymentMiscEntry>;
}

export function PaymentMiscAmountRow({
  entry,
  labels,
  onPatch,
  onDelete,
  onUploadFile,
  onRemoveFile,
}: PaymentMiscAmountRowProps) {
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [description, setDescription] = useState(entry.description ?? '');
  const [amount, setAmount] = useState(String(entry.amount_cny));
  const [completed, setCompleted] = useState(entry.is_completed);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSynced = useRef(JSON.stringify(entry));

  useEffect(() => {
    const serialized = JSON.stringify(entry);
    if (serialized !== lastSynced.current) {
      lastSynced.current = serialized;
      setEntryDate(formatDateForInput(entry.entry_date) || todayYmdLocal());
      setDescription(entry.description ?? '');
      setAmount(String(entry.amount_cny));
      setCompleted(entry.is_completed);
    }
  }, [entry]);

  const flushTextFields = async () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    const num = Number.isFinite(amt) ? amt : 0;
    const dateYmd = formatDateForInput(entryDate) || todayYmdLocal();
    const prevDateYmd = formatDateForInput(entry.entry_date) || todayYmdLocal();
    const payload = {
      entry_date: dateYmd,
      description: description.trim() || null,
      amount_cny: num,
    };
    if (
      dateYmd === prevDateYmd &&
      (payload.description ?? '') === (entry.description ?? '') &&
      num === entry.amount_cny
    ) {
      return;
    }
    setSaving(true);
    try {
      await onPatch(entry.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleCompletedChange = async (checked: boolean) => {
    setCompleted(checked);
    setSaving(true);
    try {
      await onPatch(entry.id, { is_completed: checked });
    } catch {
      setCompleted(!checked);
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      await onUploadFile(entry.id, f);
    } finally {
      setUploading(false);
    }
  };

  const fileUrl = getMiscEntryFileUrl(entry);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/80 align-middle">
      <td className="px-2 py-2">
        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          onBlur={() => flushTextFields()}
          className="w-full min-w-[9rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => flushTextFields()}
          placeholder={labels.description}
          className="w-full min-w-[12rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-sm shrink-0">¥</span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => flushTextFields()}
            className="w-full min-w-[6rem] rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums text-right"
          />
        </div>
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => handleCompletedChange(e.target.checked)}
          disabled={saving}
          className="w-4 h-4 rounded border-gray-300 text-purple-600"
          title={labels.completed}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-[10rem]">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? '…' : labels.file}
          </button>
          {fileUrl && entry.original_filename && (
            <div className="flex items-center gap-1 text-xs truncate max-w-[200px]">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline flex items-center gap-0.5 truncate"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{entry.original_filename}</span>
              </a>
              <button
                type="button"
                onClick={() => onRemoveFile(entry.id)}
                className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                title={labels.delete}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-center w-12">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('이 행을 삭제할까요?')) onDelete(entry.id);
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          title={labels.delete}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
