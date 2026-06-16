import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  createSalesSettlementLedgerEntry,
  deleteSalesSettlementLedgerEntry,
  getSalesSettlementLedgerEntries,
  getSalesSettlementLedgerSummaries,
  type SalesSettlementLedgerEntry,
  type SalesSettlementLedgerPartner,
} from '../../api/shopSalesSettlementLedgerApi';
import { formatKrwAmount } from '../../utils/shopSalesSettlement';

const PARTNER_LABEL: Record<SalesSettlementLedgerPartner, string> = {
  wk: 'WK 정산 장부',
  inventio: '인벤티오 정산 장부',
};

const PARTNER_TONE: Record<SalesSettlementLedgerPartner, { bar: string; accent: string }> = {
  wk: { bar: 'bg-blue-50/80', accent: 'text-blue-800' },
  inventio: { bar: 'bg-violet-50/80', accent: 'text-violet-800' },
};

const PAGE_SIZE = 10;

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SalesSettlementPartnerLedgerModalProps {
  partner: SalesSettlementLedgerPartner;
  isOpen: boolean;
  onClose: () => void;
  grossAmount: number;
  onChanged: () => void;
}

export function SalesSettlementPartnerLedgerModal({
  partner,
  isOpen,
  onClose,
  grossAmount,
  onChanged,
}: SalesSettlementPartnerLedgerModalProps) {
  const [entries, setEntries] = useState<SalesSettlementLedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settlementDate, setSettlementDate] = useState(todayYmd());
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const loadEntries = useCallback(async (pageToLoad = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSalesSettlementLedgerEntries(partner, pageToLoad, PAGE_SIZE);
      setEntries(result.items);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
      setPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '장부 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [partner, page]);

  const loadLedgerTotal = useCallback(async () => {
    try {
      const summaries = await getSalesSettlementLedgerSummaries();
      setLedgerTotal(summaries[partner].totalAmount);
    } catch {
      // summary 실패 시 유지
    }
  }, [partner]);

  useEffect(() => {
    if (!isOpen) return;
    void loadEntries();
    void loadLedgerTotal();
  }, [isOpen, loadEntries, loadLedgerTotal]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSettlementDate(todayYmd());
      setAmountInput('');
      setNoteInput('');
      setError(null);
    }
  }, [isOpen, partner]);

  if (!isOpen) return null;

  const tone = PARTNER_TONE[partner];
  const remainingAmount = grossAmount - ledgerTotal;

  const handleAdd = async () => {
    const amount = Number(amountInput.replace(/,/g, '').trim());
    if (!settlementDate.trim()) {
      setError('정산일을 입력해 주세요.');
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('정산금액은 1원 이상의 정수로 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createSalesSettlementLedgerEntry({
        partner,
        settlementDate,
        amount,
        note: noteInput.trim() || null,
      });
      setAmountInput('');
      setNoteInput('');
      await loadEntries(1);
      await loadLedgerTotal();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '정산 장부 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 장부 항목을 삭제할까요?')) return;

    setDeletingId(id);
    setError(null);
    try {
      await deleteSalesSettlementLedgerEntry(id);
      await loadEntries();
      await loadLedgerTotal();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '정산 장부 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-settlement-ledger-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0 ${tone.bar}`}>
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className={`w-5 h-5 shrink-0 ${tone.accent}`} />
            <div className="min-w-0">
              <h2 id="sales-settlement-ledger-modal-title" className="text-lg font-bold text-gray-900">
                {PARTNER_LABEL[partner]}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                장부 합계 {formatKrwAmount(ledgerTotal)} · 잔여{' '}
                <span className={remainingAmount < 0 ? 'text-red-600 font-medium' : tone.accent}>
                  {formatKrwAmount(remainingAmount)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:bg-white/80 hover:text-gray-900 transition-colors shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <p className="text-xs font-medium text-gray-600 mb-2">정산 등록</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="ledger-settlement-date" className="block text-[11px] text-gray-500 mb-1">
                정산일
              </label>
              <input
                id="ledger-settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="ledger-amount" className="block text-[11px] text-gray-500 mb-1">
                정산금액(₩)
              </label>
              <input
                id="ledger-amount"
                type="number"
                min={1}
                step={1}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="100000"
                className="w-32 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label htmlFor="ledger-note" className="block text-[11px] text-gray-500 mb-1">
                메모 (선택)
              </label>
              <input
                id="ledger-note"
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="메모"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              등록
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              불러오는 중...
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-lg">
              등록된 정산 내역이 없습니다.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-medium text-gray-600">정산일</th>
                  <th className="pb-2 font-medium text-gray-600 text-right">정산금액</th>
                  <th className="pb-2 font-medium text-gray-600">메모</th>
                  <th className="pb-2 w-10" aria-label="삭제" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/60">
                    <td className="py-2.5 text-gray-800 whitespace-nowrap">{entry.settlementDate}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium text-gray-900">
                      {formatKrwAmount(entry.amount)}
                    </td>
                    <td className="py-2.5 text-gray-500 max-w-[140px] truncate" title={entry.note ?? undefined}>
                      {entry.note || '-'}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label="삭제"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-500">
              {totalItems.toLocaleString()}건 · {page}/{totalPages}페이지
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadEntries(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-md border border-gray-300 hover:bg-white disabled:opacity-40"
                aria-label="이전 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void loadEntries(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-md border border-gray-300 hover:bg-white disabled:opacity-40"
                aria-label="다음 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SalesSettlementLedgerIconButton({
  onClick,
  title,
  tone,
}: {
  onClick: () => void;
  title: string;
  tone: 'wk' | 'inventio';
}) {
  const toneClass =
    tone === 'wk'
      ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-900 hover:border-blue-300'
      : 'text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100 hover:text-violet-900 hover:border-violet-300';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors shrink-0 ${toneClass}`}
    >
      <BookOpen className="w-5 h-5" strokeWidth={2.25} />
    </button>
  );
}
