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
  function formatDeviceDisplay(log: AccessLogItem): string {
    if (log.device_model?.trim()) {
      return `${log.device_model.trim()} (${log.device})`;
    }
    return log.device;
  }

  return (
    <div className="font-mono text-sm text-gray-800 border border-gray-200 rounded-lg bg-gray-50 p-4">
      {items.map((log) => (
        <div
          key={log.id}
          className="py-2 border-b border-gray-200 last:border-b-0"
        >
          {/* 모바일: 1행 - 접속 ID, 사용자명 */}
          <div className="flex flex-wrap items-center gap-x-2 md:hidden">
            <span className="text-gray-500">{t('accessLog.id')}:</span>
            <span>{log.user_id}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{t('accessLog.userName')}:</span>
            <span>{log.user_name}</span>
          </div>
          {/* 모바일: 2행 - 접속시간 */}
          <div className="mt-1 md:hidden">
            <span className="text-gray-500">{t('accessLog.accessedAt')}:</span>
            <span className="ml-1">{formatDateTime(log.accessed_at)}</span>
          </div>
          {/* 모바일: 3행 - 접속IP */}
          <div className="mt-1 md:hidden">
            <span className="text-gray-500">{t('accessLog.ip')}:</span>
            <span className="ml-1">{log.ip ?? '-'}</span>
          </div>
          {/* PC: 1행 - 접속 ID, 사용자명, 접속시간, 접속IP */}
          <div className="hidden md:flex flex-wrap items-center gap-x-2 gap-y-0">
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
          </div>
          {/* 4행(모바일) / 2행(PC) - 기기 */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0 text-gray-700">
            <span className="text-gray-500">{t('accessLog.device')}:</span>
            <span>{formatDeviceDisplay(log)}</span>
          </div>
          {/* 5행(모바일) / 3행(PC) - URL */}
          <div className="mt-1 break-all text-gray-700">
            <span className="text-gray-500">{t('accessLog.url')}:</span> {log.url}
          </div>
        </div>
      ))}
    </div>
  );
}
