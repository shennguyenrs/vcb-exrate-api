import { initDb } from "@/db";
import convertRoutes from "@/routes/convert";
import ratesRoutes from "@/routes/rates";
import taptapsendRoutes from "@/routes/taptapsend";
import vcbRoutes from "@/routes/vcb";
import { customLogger } from "@/utils";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();

// Middlewares
app.use(logger(customLogger));

// Routes
app.route("/rates", ratesRoutes);
app.route("/rates/vcb", vcbRoutes);
app.route("/rates/taptapsend", taptapsendRoutes);
app.route("/convert", convertRoutes);

app.notFound((c) => c.text("Endpoint not found"));

export default await (async () => {
  try {
    await initDb();
    console.log("DuckDB initialized");
  } catch (err) {
    console.error("Failed to initialize DuckDB:", err);
    process.exit(1);
  }

  return {
    port: 3000,
    fetch: app.fetch,
  };
})();
