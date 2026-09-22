import { pool } from "./server/db.js";

console.log("HOST:", pool.options.host);
console.log("DATABASE:", pool.options.database);
console.log("USER:", pool.options.user);
console.log("PORT:", pool.options.port);

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS user,
      current_schema() AS schema,
      to_regclass('public.stock') AS public_stock
  `);

  console.log(result.rows);
} catch (error) {
  console.error("DB ERROR:", error.message);
} finally {
  await pool.end();
}