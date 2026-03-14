import { useState, useEffect, useCallback } from 'react';
import { getAccessLogs, getAdminAccountOptions } from '../../api/accessLogApi';
import { TablePagination } from '../ui/table-pagination';
import { AccessLogFilter } from './AccessLogFilter';
import { AccessLogList } from './AccessLogList';
import { useLanguage } from '../../contexts/LanguageContext';

const PAGE_SIZE = 20;

export function AccessLogPage() {
  const { t } = useLanguage();
  const [filterOptions, setFilterOptions] = useState<{ value: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ data: typeof import('../../types/accessLog').AccessLogItem[]; pagination: typeof import('../../types/accessLog').AccessLogPagination } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    getAdminAccountOptions()
      .then((list) => {
        if (cancelled) return;
        setFilterOptions([
          { value: '', label: t('accessLog.filterAll') },
          ...list.map((a) => ({ value: a.name, label: a.name })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setFilterOptions([{ value: '', label: t('accessLog.filterAll') }]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [t]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAccessLogs({
        page,
        limit: PAGE_SIZE,
        userName: selectedUserName || undefined,
      });
      setData({ data: res.data, pagination: res.pagination });
    } catch (e) {
      setError(e instanceof Error ? e.message : '접속 로그 조회에 실패했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, selectedUserName]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (value: string) => {
    setSelectedUserName(value);
    setPage(1);
  };

  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.total ?? 0;
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE - 1;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        {t('accessLog.title')}
      </h1>
      <div className="mb-4">
        <AccessLogFilter
          options={filterOptions}
          selectedValue={selectedUserName}
          onSelectionChange={handleFilterChange}
          disabled={loading}
          loadingOptions={optionsLoading}
        />
      </div>
      {error && (
        <div className="mb-4 py-2 px-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <AccessLogList items={data?.data ?? []} loading={loading} />
      {data && totalItems > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={PAGE_SIZE}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPageOptions={[20]}
          onPageChange={setPage}
          onItemsPerPageChange={() => {}}
        />
      )}
    </div>
  );
}
