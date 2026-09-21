import pg from "pg";
import dotenv from "dotenv";

dotenv.config({
  path: new URL("./.env", import.meta.url),
});

const { Pool, types } = pg;

// PostgreSQL DATE is a calendar date, not a timestamp. Keep it as a YYYY-MM-DD
// string so JSON serialization never shifts it to the previous day in IST.
types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set. Check server/.env"
  );
}

// Set the PostgreSQL session timezone as part of the connection itself.
// Do not run an async query from pool.on("connect"): pg can hand the same
// client to application code before that query finishes, which causes the
// pg 9 "client is already executing a query" deprecation warning.
const connectionOptions = {
  connectionString: process.env.DATABASE_URL,
  options: "-c timezone=Asia/Kolkata",
};

export const pool = new Pool(connectionOptions);

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client", err);
});