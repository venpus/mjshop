import { Link } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { OverallSummaryProduct } from '../../../api/productCollabApi';

export interface OverallSummaryTableProps {
  products: OverallSummaryProduct[];
}

const PRIORITY_KEYS = {
  issue: 'productCollab.priorityIssue',
  delayed: 'productCollab.priorityDelayed',
  normal: 'productCollab.priorityNormal',
} as const;

function PriorityBadge({ priority }: { priority: 'issue' | 'delayed' | 'normal' }) {
  const { t } = useLanguage();
  const className =
    priority === 'issue'
      ? 'text-[#B91C1C] font-medium'
      : priority === 'delayed'
        ? 'text-[#B45309] font-medium'
        : 'text-[#6B7280]';
  return <span className={className}>{t(PRIORITY_KEYS[priority])}</span>;
}

export function OverallSummaryTable({ products }: OverallSummaryTableProps) {
  if (!products.length) return null;

  return (
    <div className="rounded-lg border border-[#E5E7EB] divide-y divide-[#E5E7EB] overflow-hidden">
      {products.map((row, index) => (
        <div
          key={`${row.productId}-${index}`}
          className="bg-white p-3 text-sm text-[#1F2937] hover:bg-[#F9FAFB]"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
            <Link
              to={`/admin/product-collab/thread/${row.productId}?from=summary`}
              className="text-[#2563EB] hover:underline font-medium shrink-0"
            >
              {row.productName}
            </Link>
            <span className="text-[#9CA3AF]">|</span>
            <PriorityBadge priority={row.priority ?? 'normal'} />
            <span className="text-[#9CA3AF]">|</span>
            <span className="text-[#B91C1C]">{row.delayedNote ?? '-'}</span>
          </div>
          <p className="text-[#374151] pl-0">{row.summary}</p>
        </div>
      ))}
    </div>
  );
}
