export interface Account {
  id: number;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  balance_current: number;
  balance_available: number | null;
  balance_limit: number | null;
  currency: string;
  institution_id: string | null;
  institution_name: string | null;
  last_synced: string;
}
