import { VCB_EXRATE_API } from "@/constants";
import { parseVcbExrateData } from "@/utils";
import { Context, Hono } from "hono";

const vcbRoutes = new Hono();

vcbRoutes.get("/", getAllRates);
vcbRoutes.get("/:currency", getRatesByCurrency);

async function getAllRates(c: Context) {
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);

    const rates = data.rates.map((rate) => ({
      name: "vcb",
      lastUpdated: data.lastUpdated,
      currencyCode: rate.currencyCode,
      currencyName: rate.currencyName,
      rate: {
        buy: rate.buy,
        transfer: rate.transfer,
        sell: rate.sell,
      },
    }));

    const response = {
      success: true,
      message: "Get Vietcombank exchange rates successfully",
      data: {
        rates,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({
      success: false,
      message: "Get Vietcombank exchange rates failed",
    });
  }
}

async function getRatesByCurrency(c: Context) {
  const currency = c.req.param("currency");

  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);
    const currencyRate = data.rates.find(
      (rate) => rate.currencyCode.toLowerCase() === currency,
    );

    if (!currencyRate) {
      return c.json({
        success: false,
        message: `${currency} rate not found`,
      });
    }

    const response = {
      success: true,
      message: "Get vcb exchange rate successfully",
      data: {
        rates: [
          {
            name: "vcb",
            lastUpdated: data.lastUpdated,
            rate: {
              buy: currencyRate.buy,
              transfer: currencyRate.transfer,
              sell: currencyRate.sell,
            },
          },
        ],
      },
    };

    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({
      success: false,
      message: "Get Vietcombank exchange rate failed",
    });
  }
}

export default vcbRoutes;
