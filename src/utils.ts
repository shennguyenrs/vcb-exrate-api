import { XMLParser } from "fast-xml-parser";
import { ExrateItem, FormattedExrateData, ConvertAmountData } from "./types";
import { VCB_EXRATE_API } from "./constants";

/* VCB helpers */

export function parseVcbExrateData(xmlData: string): FormattedExrateData {
  // Configure parser options
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
  };

  const parser = new XMLParser(options);
  const result = parser.parse(xmlData);

  // Parse numeric values safely
  const parseRate = (value: string): number | null => {
    return value === "-" ? 0 : parseFloat(value.replace(/,/g, ""));
  };

  // Make sure to handle both array and single item cases
  const exrates = Array.isArray(result.ExrateList.Exrate)
    ? result.ExrateList.Exrate
    : [result.ExrateList.Exrate];

  const formattedData: FormattedExrateData = {
    dateTime: result.ExrateList.DateTime,
    lastUpdate: result.ExrateList.DateTime,
    source: result.ExrateList.Source,
    rates: exrates.map((rate: ExrateItem) => ({
      currencyCode: rate.CurrencyCode,
      currencyName: rate.CurrencyName.trim(),
      buy: parseRate(rate.Buy),
      transfer: parseRate(rate.Transfer),
      sell: parseRate(rate.Sell),
    })),
  };

  return formattedData;
}

export async function convertVcb({
  currency,
  amount,
}: {
  currency: string;
  amount: string;
}) {
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);
    const currencyRate = data.rates.find(
      (rate) => rate.currencyCode.toLowerCase() === currency,
    );

    if (!currencyRate) {
      throw new Error(`${currency} rate not found`);
    }

    const sellTransfer =
      ((currencyRate.sell + currencyRate.transfer) / 2) * Number(amount);
    const sellBuy =
      ((currencyRate.sell + currencyRate.buy) / 2) * Number(amount);

    const convertData: ConvertAmountData = {
      dateTime: data.dateTime,
      sellTransfer: sellTransfer,
      sellBuy: sellBuy,
    };

    return convertData;
  } catch (error) {
    console.error(error);
    return {
      dateTime: "",
      sellTransfer: 0,
      sellBuy: 0,
    } as ConvertAmountData;
  }
}
