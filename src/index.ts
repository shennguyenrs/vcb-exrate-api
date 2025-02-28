import { Hono } from "hono";
import { XMLParser } from "fast-xml-parser";

interface ExrateItem {
  CurrencyCode: string;
  CurrencyName: string;
  Buy: string;
  Transfer: string;
  Sell: string;
}

interface FormattedExrateData {
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

interface ConvertAmountData {
  dateTime: string;
  sellTransfer: number;
  sellBuy: number;
}

const VCB_EXRATE_API =
  "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseExrateData(rawText);
    return c.json(data);
  } catch (error) {
    console.error(error);
  }

  return c.text("Hello Hono!");
});

app.get("/convert/eur/:amount", async (c) => {
  const amount = c.req.param("amount");

  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseExrateData(rawText);
    const eurRate = data.rates.find((rate) => rate.currencyCode === "EUR");

    if (!eurRate) {
      throw new Error("EUR rate not found");
    }

    const sellTransfer =
      ((eurRate.sell + eurRate.transfer) / 2) * Number(amount);
    const sellBuy = ((eurRate.sell + eurRate.buy) / 2) * Number(amount);

    const convertData: ConvertAmountData = {
      dateTime: data.dateTime,
      sellTransfer: sellTransfer,
      sellBuy: sellBuy,
    };

    return c.json(convertData);
  } catch (error) {
    console.error(error);
  }

  return c.text("Hello Hono!");
});

function parseExrateData(xmlData: string): FormattedExrateData {
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

export default app;
