import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";

export const authRouter = Router();

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, encoded) {
  const [scheme, salt, expected] = String(encoded || "").split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return expectedBuf.length === actual.length && crypto.timingSafeEqual(actual, expectedBuf);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name || row.username, role: row.role || "admin" };
}

export async function ensureAdminAuthTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Administrator',
      role TEXT NOT NULL DEFAULT 'admin',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`DELETE FROM admin_sessions WHERE expires_at <= now()`);

  const username = String(process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  const displayName = String(process.env.ADMIN_DISPLAY_NAME || "Administrator").trim() || "Administrator";
  if (!password) {
    throw new Error("ADMIN_PASSWORD is required. Set ADMIN_USERNAME and ADMIN_PASSWORD in server/.env before starting the server.");
  }
  const existing = await pool.query(`SELECT id FROM admin_users WHERE username=$1 LIMIT 1`, [username]);
  if (!existing.rowCount) {
    await pool.query(
      `INSERT INTO admin_users(username,password_hash,display_name,role) VALUES ($1,$2,$3,'admin')`,
      [username, hashPassword(password), displayName]
    );
    console.log(`[auth] Created admin user: ${username}`);
  }
}

export async function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const { rows } = await pool.query(`
      SELECT a.id,a.username,a.display_name,a.role
      FROM admin_sessions s
      JOIN admin_users a ON a.id=s.admin_user_id
      WHERE s.token_hash=$1 AND s.expires_at > now() AND a.active=true
      LIMIT 1
    `, [hashToken(token)]);
    if (!rows[0]) return res.status(401).json({ error: "Session expired or invalid" });
    await pool.query(`UPDATE admin_sessions SET last_seen_at=now() WHERE token_hash=$1`, [hashToken(token)]);
    req.admin = safeUser(rows[0]);
    req.authTokenHash = hashToken(token);
    next();
  } catch (err) {
    console.error("[auth] middleware error:", err);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
}

authRouter.post("/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const { rows } = await pool.query(`SELECT * FROM admin_users WHERE username=$1 AND active=true LIMIT 1`, [username]);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: "Invalid username or password" });
    const token = crypto.randomBytes(32).toString("hex");
    await pool.query(`INSERT INTO admin_sessions(admin_user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '7 days')`, [user.id, hashToken(token)]);
    await pool.query(`DELETE FROM admin_sessions WHERE admin_user_id=$1 AND expires_at <= now()`, [user.id]);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Unable to sign in" });
  }
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.admin }));

authRouter.post("/change-password", requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from the current password" });
    }

    const { rows } = await pool.query(
      `SELECT id, password_hash FROM admin_users WHERE id=$1 AND active=true LIMIT 1`,
      [req.admin.id]
    );
    const user = rows[0];
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const newHash = hashPassword(newPassword);
    await pool.query(
      `UPDATE admin_users SET password_hash=$1, updated_at=now() WHERE id=$2`,
      [newHash, user.id]
    );

    // Keep the current session alive, but invalidate every other admin session.
    await pool.query(
      `DELETE FROM admin_sessions WHERE admin_user_id=$1 AND token_hash<>$2`,
      [user.id, req.authTokenHash]
    );

    res.json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("[auth] change-password error:", err);
    res.status(500).json({ error: "Unable to change password" });
  }
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM admin_sessions WHERE token_hash=$1`, [req.authTokenHash]);
  res.json({ ok: true });
});
