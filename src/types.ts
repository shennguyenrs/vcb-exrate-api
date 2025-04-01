export interface ExrateItem {
  CurrencyCode: string;
  CurrencyName: string;
  Buy: string;
  Transfer: string;
  Sell: string;
}

export interface FormattedExrateData {
  dateTime: string;
  lastUpdate: string;
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
