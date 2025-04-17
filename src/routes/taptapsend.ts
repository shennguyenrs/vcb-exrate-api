import { Context, Hono } from "hono";
import { scrapingTtsRates } from "../utils";

const ttsRoutes = new Hono();
ttsRoutes.get("/eur", getRatesByCurrency);

async function getRatesByCurrency(c: Context) {
  try {
    const ttsRates = await scrapingTtsRates({});
    const response = {
      success: true,
      message: "Get TaptapSend exchange rates successfully",
      data: {
        rates: [ttsRates],
      },
    };
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({
      success: false,
      message: "Get TaptapSend exchange rates failed",
    });
  }
}

export default ttsRoutes;
