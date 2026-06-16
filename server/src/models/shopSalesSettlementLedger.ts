export type SalesSettlementLedgerPartner = 'wk' | 'inventio';

export interface SalesSettlementLedgerEntry {
  id: string;
  partner: SalesSettlementLedgerPartner;
  settlementDate: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CreateSalesSettlementLedgerDTO {
  partner: SalesSettlementLedgerPartner;
  settlementDate: string;
  amount: number;
  note?: string | null;
}

export interface SalesSettlementLedgerSummary {
  totalAmount: number;
  entryCount: number;
}

export interface SalesSettlementLedgerListResult {
  items: SalesSettlementLedgerEntry[];
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
}
