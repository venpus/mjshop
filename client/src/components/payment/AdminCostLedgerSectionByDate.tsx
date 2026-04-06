import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  groupAdminCostConfirmedRowsByDate,
  type AdminCostConfirmedRow,
} from '../../utils/adminCostStatistics';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AdminCostLedgerVariant } from './adminCostLedgerTypes';

function groupAccordionKey(sectionKey: string, dateKey: string | null): string {
  return `${sectionKey}:${dateKey ?? '__none__'}`;
}

function formatGroupDateLabel(dateKey: string | null, language: 'ko' | 'zh', unknownLabel: string): string {
  if (!dateKey) return unknownLabel;
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const VARIANT_STYLES: Record<
  AdminCostLedgerVariant,
  {
    sectionBar: string;
    sectionSubtotal: string;
    cardBorder: string;
    cardBg: string;
    buttonHover: string;
    chevron: string;
    dayTotal: string;
    tableBorderTop: string;
    tableHead: string;
    rowHover: string;
    amountCell: string;
  }
> = {
  confirmed: {
    sectionBar: 'border-amber-600',
    sectionSubtotal: 'text-amber-800',
    cardBorder: 'border-amber-200/80',
    cardBg: 'bg-amber-50/30',
    buttonHover: 'hover:bg-amber-100/50',
    chevron: 'text-amber-800',
    dayTotal: 'text-amber-900',
    tableBorderTop: 'border-amber-100',
    tableHead: 'bg-amber-50/90',
    rowHover: 'hover:bg-amber-50/50',
    amountCell: 'text-amber-900',
  },
  paid: {
    sectionBar: 'border-green-600',
    sectionSubtotal: 'text-green-800',
    cardBorder: 'border-green-200/80',
    cardBg: 'bg-green-50/30',
    buttonHover: 'hover:bg-green-100/50',
    chevron: 'text-green-800',
    dayTotal: 'text-green-900',
    tableBorderTop: 'border-green-100',
    tableHead: 'bg-green-50/90',
    rowHover: 'hover:bg-green-50/50',
    amountCell: 'text-green-900',
  },
};

function LedgerRowsTable({
  variant,
  rows,
  formatCurrency,
  nameHeader,
  amountHeader,
}: {
  variant: AdminCostLedgerVariant;
  rows: AdminCostConfirmedRow[];
  formatCurrency: (n: number) => string;
  nameHeader: string;
  amountHeader: string;
}) {
  const s = VARIANT_STYLES[variant];
  return (
    <div className={`border-t ${s.tableBorderTop} bg-white max-h-[min(36vh,280px)] overflow-y-auto`}>
      <table className="min-w-full text-sm">
        <thead className={`${s.tableHead} sticky top-0 z-10`}>
          <tr>
            <th className="text-left py-2 px-3 font-semibold text-gray-700">{nameHeader}</th>
            <th className="text-right py-2 px-3 font-semibold text-gray-700 w-36">{amountHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className={s.rowHover}>
              <td className="py-2 px-3 text-gray-900 break-words max-w-[70vw] sm:max-w-md">{row.name}</td>
              <td
                className={`py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${s.amountCell}`}
              >
                {formatCurrency(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface AdminCostLedgerSectionByDateProps {
  variant: AdminCostLedgerVariant;
  isActive: boolean;
  sectionKey: string;
  /** true면 발주/패킹 구역 제목 없이 날짜별 목록만 표시 */
  mergedLayout?: boolean;
  /** mergedLayout이 아닐 때만 사용 */
  title?: string;
  rows: AdminCostConfirmedRow[];
  emptyLabel: string;
  formatCurrency: (n: number) => string;
  nameHeader: string;
  amountHeader: string;
}

export function AdminCostLedgerSectionByDate({
  variant,
  isActive,
  sectionKey,
  mergedLayout = false,
  title,
  rows,
  emptyLabel,
  formatCurrency,
  nameHeader,
  amountHeader,
}: AdminCostLedgerSectionByDateProps) {
  const { t, language } = useLanguage();
  const groups = useMemo(() => groupAdminCostConfirmedRowsByDate(rows), [rows]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const s = VARIANT_STYLES[variant];

  useEffect(() => {
    if (!isActive) return;
    const next: Record<string, boolean> = {};
    groups.forEach((g, i) => {
      next[groupAccordionKey(sectionKey, g.dateKey)] = i === 0;
    });
    setExpanded(next);
  }, [isActive, groups, sectionKey]);

  const unknownLabel = t('payment.adminCostConfirmedDateUnknown');

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className={mergedLayout ? 'mb-0' : 'mb-6 last:mb-0'}>
      {!mergedLayout && title ? (
        <h3 className={`text-base font-bold text-gray-900 mb-2 px-1 border-l-4 ${s.sectionBar} pl-2`}>
          {title}
          <span className={`ml-2 text-sm font-semibold tabular-nums ${s.sectionSubtotal}`}>
            ({formatCurrency(rows.reduce((sum, r) => sum + r.amount, 0))})
          </span>
        </h3>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 px-2 bg-gray-50 rounded-lg">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const key = groupAccordionKey(sectionKey, g.dateKey);
            const open = expanded[key] ?? false;
            const dateLabel = formatGroupDateLabel(g.dateKey, language, unknownLabel);
            return (
              <div
                key={key}
                className={`border ${s.cardBorder} rounded-lg overflow-hidden ${s.cardBg} shadow-sm`}
              >
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 text-left py-2.5 px-3 ${s.buttonHover} transition-colors`}
                  aria-expanded={open}
                  aria-controls={`${key}-panel`}
                  id={`${key}-heading`}
                  onClick={() => toggle(key)}
                >
                  {open ? (
                    <ChevronDown className={`w-4 h-4 shrink-0 ${s.chevron}`} aria-hidden />
                  ) : (
                    <ChevronRight className={`w-4 h-4 shrink-0 ${s.chevron}`} aria-hidden />
                  )}
                  <span className="flex-1 min-w-0 font-semibold text-gray-900">{dateLabel}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums whitespace-nowrap shrink-0 ${s.dayTotal}`}
                  >
                    {formatCurrency(g.subtotal)}
                  </span>
                </button>
                {open ? (
                  <div id={`${key}-panel`} role="region" aria-labelledby={`${key}-heading`}>
                    <LedgerRowsTable
                      variant={variant}
                      rows={g.rows}
                      formatCurrency={formatCurrency}
                      nameHeader={nameHeader}
                      amountHeader={amountHeader}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
