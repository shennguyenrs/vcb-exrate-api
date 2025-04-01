import { Context, Hono } from "hono";
import { convertVcb } from "../utils";

const convertRoutes = new Hono();

convertRoutes.get("/:currency/:amount", convertAmountBasedOnCurrency);

async function convertAmountBasedOnCurrency(c: Context) {
  const amount = c.req.param("amount");
  const currency = c.req.param("currency");

  try {
    const convertedVcb = await convertVcb({
      currency,
      amount,
    });
    return c.json(convertedVcb);
  } catch (error) {
    console.error(error);
    return c.text("Convert failed");
  }
}

export default convertRoutes;
