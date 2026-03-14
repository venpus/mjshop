export interface AccessLogItem {
  id: number;
  user_id: string;
  accessed_at: string;
  ip: string | null;
  url: string;
  device: 'PC' | 'Mobile';
  user_name: string;
}

export interface AccessLogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccessLogListResponse {
  data: AccessLogItem[];
  pagination: AccessLogPagination;
}
