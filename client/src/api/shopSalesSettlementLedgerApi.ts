import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();

export type SalesSettlementLedgerPartner = 'wk' | 'inventio';

export interface SalesSettlementLedgerEntry {
  id: string;
  partner: SalesSettlementLedgerPartner;
  settlementDate: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface SalesSettlementLedgerSummary {
  totalAmount: number;
  entryCount: number;
}

export interface SalesSettlementLedgerSummaries {
  wk: SalesSettlementLedgerSummary;
  inventio: SalesSettlementLedgerSummary;
}

export interface SalesSettlementLedgerListResult {
  items: SalesSettlementLedgerEntry[];
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getSalesSettlementLedgerSummaries(): Promise<SalesSettlementLedgerSummaries> {
  const response = await fetch(`${API_BASE_URL}/shop-sales-settlement/ledger/summary`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '정산 장부 요약을 불러오지 못했습니다.');
  }
  return data.data as SalesSettlementLedgerSummaries;
}

export async function getSalesSettlementLedgerEntries(
  partner: SalesSettlementLedgerPartner,
  page = 1,
  limit = 10
): Promise<SalesSettlementLedgerListResult> {
  const params = new URLSearchParams({
    partner,
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(`${API_BASE_URL}/shop-sales-settlement/ledger?${params}`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '정산 장부 목록을 불러오지 못했습니다.');
  }
  return data.data as SalesSettlementLedgerListResult;
}

export async function createSalesSettlementLedgerEntry(payload: {
  partner: SalesSettlementLedgerPartner;
  settlementDate: string;
  amount: number;
  note?: string | null;
}): Promise<SalesSettlementLedgerEntry> {
  const response = await fetch(`${API_BASE_URL}/shop-sales-settlement/ledger`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '정산 장부 등록에 실패했습니다.');
  }
  return data.data as SalesSettlementLedgerEntry;
}

export async function deleteSalesSettlementLedgerEntry(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/shop-sales-settlement/ledger/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '정산 장부 삭제에 실패했습니다.');
  }
}
