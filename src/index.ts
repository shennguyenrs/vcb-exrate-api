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

app.get("/:currency", async (c) => {
  const currency = c.req.param("currency");
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseExrateData(rawText);
    const currencyRate = data.rates.find(
      (rate) => rate.currencyCode.toLowerCase() === currency,
    );

    if (!currencyRate) {
      throw new Error(`${currency} rate not found`);
    }

    const formattedData: FormattedExrateData = {
      ...data,
      rates: [currencyRate],
    };
    return c.json(formattedData);
  } catch (error) {
    console.error(error);
  }

  return c.text("Hello Hono!");
});

app.get("/convert/:currency/:amount", async (c) => {
  const amount = c.req.param("amount");
  const currency = c.req.param("currency");

  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseExrateData(rawText);
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
