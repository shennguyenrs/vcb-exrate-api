import { Context, Hono } from "hono";
import { VCB_EXRATE_API } from "../constants";
import { FormattedExrateData } from "../types";
import { parseVcbExrateData } from "../utils";

const vcbRoutes = new Hono();

vcbRoutes.get("/", getAllRates);
vcbRoutes.get("/:currency", getRatesByCurrency);

async function getAllRates(c: Context) {
  try {
    const res = await fetch(VCB_EXRATE_API);
    const rawText = await res.text();
    const data = parseVcbExrateData(rawText);

    return c.json(data);
  } catch (error) {
    console.error(error);
    return c.text("No rates found");
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
      return c.text(`${currency} rate not found`);
    }

    const formattedData: FormattedExrateData = {
      ...data,
      rates: [currencyRate],
    };

    return c.json(formattedData);
  } catch (error) {
    console.error(error);
    return c.text("No rates found");
  }
}

export default vcbRoutes;
