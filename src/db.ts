import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import { v4 as uuidv4 } from "uuid";

let connection: DuckDBConnection;

export async function initDb() {
  if (connection) return connection;

  const instance = await DuckDBInstance.create("rates.db");
  connection = await instance.connect();

  await connection.run(`
    CREATE TABLE IF NOT EXISTS rates_cache (
      id UUID PRIMARY KEY,
      source TEXT,
      currency_code TEXT,
      data JSON,
      last_updated TIMESTAMP,
      expires_at TIMESTAMP,
      UNIQUE(source, currency_code)
    )
  `);

  return connection;
}

export async function getCachedRates({
  source,
  currencyCode,
}: {
  source: string;
  currencyCode: string;
}) {
  const conn = await initDb();

  const reader = await conn.runAndReadAll(
    `
    SELECT data, last_updated FROM rates_cache
    WHERE source = $1 AND currency_code = $2 AND expires_at > CAST(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS TIMESTAMP)
    LIMIT 1
    `,
    [source, currencyCode]
  );

  const rows = reader.getRows();

  if (rows.length > 0) {
    const data = rows[0][0];
    const lastUpdated = rows[0][1]?.toString();

    if (typeof data === "string") {
      try {
        return {
          data: JSON.parse(data),
          lastUpdated,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function saveRatesCache({
  source,
  currencyCode,
  ratesArray,
  lastUpdated,
}: {
  source: string;
  currencyCode: string;
  ratesArray: any[];
  lastUpdated: string;
}) {
  const conn = await initDb();

  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
  const dataStr = JSON.stringify(ratesArray);

  await conn.run(
    `
    INSERT INTO rates_cache (id, source, currency_code, data, last_updated, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT(source, currency_code) DO UPDATE SET
      data=excluded.data,
      last_updated=excluded.last_updated,
      expires_at=excluded.expires_at
    `,
    [
      uuidv4(),
      source,
      currencyCode,
      dataStr,
      lastUpdated,
      expires.toISOString(),
    ]
  );
}
