import { PRODUCTS } from "../shared/catalogue";
import type { Product } from "../shared/types";
import type { Env } from "./env";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL, rating REAL NOT NULL, tags TEXT NOT NULL, specs TEXT NOT NULL, summary TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT, provider TEXT NOT NULL DEFAULT 'password', avatar_url TEXT, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT, avatar_url TEXT, language TEXT NOT NULL DEFAULT 'en', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS wishlist_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE (user_id, product_id))`,
  `CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id)`,
  `CREATE TABLE IF NOT EXISTS price_alerts (id TEXT PRIMARY KEY, user_id TEXT, guest_id TEXT, product_id TEXT NOT NULL, target_price REAL NOT NULL, created_at INTEGER NOT NULL, UNIQUE (user_id, product_id))`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (id TEXT PRIMARY KEY, user_id TEXT, guest_id TEXT, title TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en', messages TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_guest ON price_alerts(guest_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_sessions(user_id, updated_at)`,
];

let migrated = false;

/** Creates tables (idempotent) and seeds the catalogue once per isolate. */
export async function ensureDb(env: Env): Promise<D1Database | null> {
  const db = env.DB;
  if (!db) return null;
  if (!migrated) {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    migrated = true;
  }
  const row = await db.prepare("SELECT COUNT(*) AS n FROM products").first<{ n: number }>();
  if (!row || row.n < PRODUCTS.length) await seedProducts(db);
  return db;
}

export async function seedProducts(db: D1Database): Promise<number> {
  const now = Date.now();
  const statements = PRODUCTS.map((p) =>
    db
      .prepare(
        `INSERT INTO products (id, name, brand, category, price, rating, tags, specs, summary, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET price = excluded.price, rating = excluded.rating,
           tags = excluded.tags, specs = excluded.specs, summary = excluded.summary, updated_at = excluded.updated_at`,
      )
      .bind(p.id, p.name, p.brand, p.category, p.price, p.rating, JSON.stringify(p.tags), JSON.stringify(p.specs), p.summary, now),
  );
  // D1 batch limit is generous (100 statements per batch is safe) — chunk anyway.
  for (let i = 0; i < statements.length; i += 50) {
    await db.batch(statements.slice(i, i + 50));
  }
  return PRODUCTS.length;
}

export async function loadProducts(env: Env): Promise<Product[]> {
  try {
    const db = await ensureDb(env);
    if (!db) return PRODUCTS;
    const { results } = await db.prepare("SELECT * FROM products").all<Record<string, unknown>>();
    if (!results?.length) return PRODUCTS;
    const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
    return results.map((row) => {
      const seeded = byId.get(String(row.id));
      return {
        ...(seeded as Product),
        id: String(row.id),
        name: String(row.name),
        brand: String(row.brand),
        category: String(row.category) as Product["category"],
        price: Number(row.price),
        rating: Number(row.rating),
        tags: JSON.parse(String(row.tags ?? "[]")),
        specs: JSON.parse(String(row.specs ?? "{}")),
        summary: String(row.summary ?? ""),
      } satisfies Product;
    });
  } catch (error) {
    console.error("loadProducts fell back to the bundled catalogue", error);
    return PRODUCTS;
  }
}

export function uid(prefix = ""): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return prefix ? `${prefix}_${hex}` : hex;
}
