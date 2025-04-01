import { Hono } from "hono";
import vcbRoutes from "./routes/vcb";
import convertRoutes from "./routes/convert";

const app = new Hono();
app.route("/vcb", vcbRoutes);
app.route("/convert", convertRoutes);
app.notFound((c) => c.text("Endpoint not found"));

export default app;
