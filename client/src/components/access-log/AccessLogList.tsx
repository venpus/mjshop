import type { AccessLogItem } from '../../types/accessLog';
import { useLanguage } from '../../contexts/LanguageContext';

export interface AccessLogListProps {
  items: AccessLogItem[];
  loading?: boolean;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AccessLogList({ items, loading }: AccessLogListProps) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        {t('common.loading')}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        {t('accessLog.noData')}
      </div>
    );
  }
  return (
    <div className="font-mono text-sm text-gray-800 border border-gray-200 rounded-lg bg-gray-50 p-4">
      {items.map((log) => (
        <div
          key={log.id}
          className="py-2 border-b border-gray-200 last:border-b-0"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
            <span className="text-gray-500">{t('accessLog.id')}:</span>
            <span>{log.user_id}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{t('accessLog.userName')}:</span>
            <span>{log.user_name}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{t('accessLog.accessedAt')}:</span>
            <span>{formatDateTime(log.accessed_at)}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{t('accessLog.ip')}:</span>
            <span>{log.ip ?? '-'}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{t('accessLog.device')}:</span>
            <span>{log.device}</span>
          </div>
          <div className="mt-1 pl-0 break-all text-gray-700">
            <span className="text-gray-500">{t('accessLog.url')}:</span> {log.url}
          </div>
        </div>
      ))}
    </div>
  );
}
