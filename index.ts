import { initDb } from "./src/db";
import convertRoutes from "./src/routes/convert";
import ratesRoutes from "./src/routes/rates";
import taptapsendRoutes from "./src/routes/taptapsend";
import vcbRoutes from "./src/routes/vcb";
import { customLogger } from "./src/utils";
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
    idleTimeout: 255,
    port: 3000,
    fetch: app.fetch,
  };
})();
