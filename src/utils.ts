import { VCB_EXRATE_API } from "@/constants";
import { getCachedRates, saveRatesCache } from "@/db";
import {
  ConvertAmountData,
  ExrateItem,
  FormattedExrateData,
  SourceDetails,
} from "@/types";
import { XMLParser } from "fast-xml-parser";
import { launch } from "puppeteer";

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
    lastUpdated: result.ExrateList.DateTime,
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
}): Promise<ConvertAmountData> {
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);
    const currencyRate = data.rates.find(
      (rate) => rate.currencyCode.toLowerCase() === currency
    );

    if (!currencyRate) {
      throw new Error(`${currency} rate not found`);
    }

    const sellTransfer =
      ((currencyRate.sell + currencyRate.transfer) / 2) * Number(amount);
    const sellBuy =
      ((currencyRate.sell + currencyRate.buy) / 2) * Number(amount);

    const convertData: ConvertAmountData = {
      dateTime: data.lastUpdated,
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
    };
  }
}

export async function scrapingVcbRates({
  currency = "eur",
}: {
  currency?: string;
}): Promise<SourceDetails> {
  const noRates: SourceDetails = {
    name: "vcb",
    lastUpdated: new Date().toISOString(),
    rate: {
      sell: 0,
      buy: 0,
      transfer: 0,
    },
  };

  try {
    const cachedResult = await getCachedRates({
      source: "vcb",
      currencyCode: currency,
    });

    if (cachedResult) {
      const { data: cached, lastUpdated } = cachedResult;
      const currencyRate = cached.find(
        (r: any) => r.currencyCode.toLowerCase() === currency
      );

      if (currencyRate) {
        return {
          name: "vcb",
          lastUpdated,
          currencyCode: currencyRate.currencyCode,
          currencyName: currencyRate.currencyName,
          rate: {
            sell: currencyRate.sell,
            buy: currencyRate.buy,
            transfer: currencyRate.transfer,
          },
        };
      }
    }

    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);

    await saveRatesCache({
      source: "vcb",
      currencyCode: currency,
      ratesArray: data.rates,
      lastUpdated: data.lastUpdated,
    });

    const currencyRate = data.rates.find(
      (r) => r.currencyCode.toLowerCase() === currency
    );

    if (currencyRate) {
      return {
        name: "vcb",
        lastUpdated: data.lastUpdated,
        currencyCode: currencyRate.currencyCode,
        currencyName: currencyRate.currencyName,
        rate: {
          sell: currencyRate.sell,
          buy: currencyRate.buy,
          transfer: currencyRate.transfer,
        },
      };
    }

    return noRates;
  } catch (error) {
    console.error(error);
    return noRates;
  }
}

/* Taptapsend helpers */

interface CurrencyOption {
  value: string;
  name: string;
}

const WAIT_TIME = 5;

export async function waitForDropdown(page: any, selector: string) {
  await page.waitForSelector(selector, { visible: true });
  await new Promise((r) => setTimeout(r, WAIT_TIME));
  await page.click(selector);
  await new Promise((r) => setTimeout(r, WAIT_TIME));
}

export async function findCurrencyOption(
  page: any,
  selector: string,
  searchText: string
): Promise<CurrencyOption> {
  return page.evaluate(
    (sel: string, text: string) => {
      const dropdown = document.querySelector(sel);
      if (!dropdown) {
        throw new Error(`Dropdown ${sel} not found`);
      }

      const allOptions = Array.from(
        document.querySelectorAll(
          `${sel} option, [role='option'], .dropdown-item`
        )
      ).map((opt) => ({
        text: opt.textContent?.trim(),
        value: (opt as HTMLOptionElement).value,
      }));

      // Split search text into parts and look for each part
      const searchParts = text.toLowerCase().split(" ");
      const optionIndex = allOptions.findIndex((i) => {
        const optionText = i.text?.toLowerCase() || "";
        return searchParts.every((part) => optionText.includes(part));
      });

      if (optionIndex === -1) {
        throw new Error(
          `Option ${text} not found in dropdown ${sel}. Available options: ${allOptions
            .map((opt) => opt.text)
            .join(", ")}`
        );
      }

      return {
        value: allOptions[optionIndex].value,
        name: allOptions[optionIndex].text || "",
      };
    },
    selector,
    searchText
  );
}

export async function scrapingTtsRates({
  origin = "Finland EUR",
  destination = "Vietnam VND",
}: {
  origin?: string;
  destination?: string;
}): Promise<SourceDetails> {
  const noRates: SourceDetails = {
    name: "taptapsend",
    lastUpdated: new Date().toISOString(),
    rate: {
      sell: 0,
      buy: 0,
      transfer: 0,
    },
  };

  try {
    const cachedResult = await getCachedRates({
      source: "taptapsend",
      currencyCode: origin + "_" + destination,
    });

    if (cachedResult && cachedResult.data && cachedResult.data.length > 0) {
      const cachedRate = cachedResult.data[0];
      return {
        name: "taptapsend",
        lastUpdated: cachedResult.lastUpdated,
        rate: {
          sell: cachedRate.sell,
          buy: cachedRate.buy,
          transfer: cachedRate.transfer,
        },
      };
    }

    const url = "https://www.taptapsend.com";
    const browser = await launch({ headless: true });
    const page = await browser.newPage();

    let result: SourceDetails = noRates;

    try {
      await page.goto(url, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, WAIT_TIME));

      // Handle origin currency
      await waitForDropdown(page, "#origin-currency");
      const fromCurrency = await findCurrencyOption(
        page,
        "#origin-currency",
        origin
      );
      await page.select("#origin-currency", fromCurrency.value);

      // Handle destination currency
      await waitForDropdown(page, "#destination-currency");
      const toCurrency = await findCurrencyOption(
        page,
        "#destination-currency",
        destination
      );
      await page.select("#destination-currency", toCurrency.value);

      // Get exchange rate
      await new Promise((r) => setTimeout(r, WAIT_TIME));
      const rate = await page.evaluate(() => {
        const rateElement = document.querySelector<HTMLInputElement>(
          "#destination-amount"
        );
        return rateElement ? rateElement.value : null;
      });

      if (rate) {
        const parsedRate = parseFloat(rate);
        const ratesArray = [
          {
            sell: parsedRate,
            buy: parsedRate,
            transfer: parsedRate,
          },
        ];

        await saveRatesCache({
          source: "taptapsend",
          currencyCode: origin + "_" + destination,
          ratesArray,
          lastUpdated: new Date().toISOString(),
        });

        result = {
          name: "taptapsend",
          lastUpdated: new Date().toISOString(),
          rate: {
            sell: parsedRate,
            buy: parsedRate,
            transfer: parsedRate,
          },
        };
      }
    } catch (error) {
      console.error(error);
    } finally {
      await browser.close();
    }

    return result;
  } catch (error) {
    console.error(error);
    return noRates;
  }
}

/* Others */
export const customLogger = (message: string, ...rest: string[]) => {
  console.log(message, ...rest);
};
