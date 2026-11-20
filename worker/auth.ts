import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { uid } from "./db";
import type { AuthUser, Env } from "./env";

export const SESSION_COOKIE = "zyn_session";
export const GUEST_COOKIE = "zyn_guest";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value: string): Uint8Array {
  const bin = atob(value);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
  const salt = unb64(saltB64);
  const expected = unb64(hashB64);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: Number(iter) || PBKDF2_ITERATIONS, hash: "SHA-256" },
      key,
      expected.length * 8,
    ),
  );
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export async function createSession(c: Context, db: D1Database, userId: string): Promise<void> {
  const token = uid("sess") + uid();
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, expires, Date.now())
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession(c: Context, db: D1Database): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function currentUser(c: Context<{ Bindings: Env }>, db: D1Database | null): Promise<AuthUser | null> {
  if (!db) return null;
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.provider, u.avatar_url, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .bind(token)
    .first<{ id: string; email: string; name: string; provider: "password" | "google"; avatar_url: string | null; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, provider: row.provider, avatarUrl: row.avatar_url };
}

/** Stable anonymous id so guests get their own chat history and alerts. */
export function guestId(c: Context): string {
  let guest = getCookie(c, GUEST_COOKIE);
  if (!guest) {
    guest = uid("guest");
    setCookie(c, GUEST_COOKIE, guest, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 365 * 86400 });
  }
  return guest;
}

export async function upsertUser(
  db: D1Database,
  input: { email: string; name: string; provider: "password" | "google"; passwordHash?: string | null; avatarUrl?: string | null },
): Promise<{ user: AuthUser; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<{
    id: string;
    email: string;
    name: string;
    provider: "password" | "google";
    avatar_url: string | null;
  }>();
  if (existing) {
    return {
      user: { id: existing.id, email: existing.email, name: existing.name, provider: existing.provider, avatarUrl: existing.avatar_url },
      created: false,
    };
  }
  const id = uid("usr");
  const now = Date.now();
  await db
    .prepare("INSERT INTO users (id, email, name, password_hash, provider, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, email, input.name, input.passwordHash ?? null, input.provider, input.avatarUrl ?? null, now)
    .run();
  await db
    .prepare("INSERT INTO profiles (id, email, display_name, avatar_url, language, created_at) VALUES (?, ?, ?, ?, 'en', ?)")
    .bind(id, email, input.name, input.avatarUrl ?? null, now)
    .run();
  return { user: { id, email, name: input.name, provider: input.provider, avatarUrl: input.avatarUrl ?? null }, created: true };
}
