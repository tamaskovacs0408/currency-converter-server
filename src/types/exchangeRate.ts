export interface ExchangeRateApiResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

export interface ExchangeRateRecord {
  base_currency: string;
  rates: Record<string, number>;
  last_updated: string;
}

interface DbRow {
  base_currency: string;
  rates: string;
  last_updated: string;
}

export type { DbRow };
