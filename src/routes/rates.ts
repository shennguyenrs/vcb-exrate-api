import { ApiResponse } from "@/types";
import { scrapingTtsRates, scrapingVcbRates } from "@/utils";
import { Context, Hono } from "hono";

const ratesRoutes = new Hono();

ratesRoutes.get("/all/eur", getAllRates);

async function getAllRates(c: Context) {
  try {
    const [vcbRates, ttsRates] = await Promise.all([
      scrapingVcbRates({}),
      scrapingTtsRates({}),
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Get exchange rates successfully",
      data: {
        rates: [vcbRates, ttsRates],
      },
    };

    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({
      success: false,
      message: "Get exchange rates failed",
    });
  }
}

export default ratesRoutes;
