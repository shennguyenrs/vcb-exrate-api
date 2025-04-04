export interface ExrateItem {
  CurrencyCode: string;
  CurrencyName: string;
  Buy: string;
  Transfer: string;
  Sell: string;
}

export interface FormattedExrateData {
  lastUpdated: string;
  source: string;
  rates: {
    currencyCode: string;
    currencyName: string;
    buy: number;
    transfer: number;
    sell: number;
  }[];
}

export interface ConvertAmountData {
  dateTime: string;
  sellTransfer: number;
  sellBuy: number;
}

export interface SourceDetails {
  name: string;
  lastUpdated: string;
  currencyCode?: string;
  currencyName?: string;
  rate: {
    sell: number;
    buy: number;
    transfer: number;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    [key: string]: any;
  };
}
