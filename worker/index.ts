import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { CATEGORY_LABELS } from "../shared/catalogue";
import { priceHistory } from "../shared/scoring";
import { rankProducts } from "../shared/scoring";
import type { Needs } from "../shared/types";
import {
  compareVerdict,
  aiConfigured,
  chatResponse,
  streamChat,
  visionSearch,
} from "./ai";
import {
  GUEST_COOKIE,
  createSession,
  currentUser,
  endSession,
  guestId,
  hashPassword,
  upsertUser,
  verifyPassword,
} from "./auth";
import { ensureDb, loadProducts, uid } from "./db";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

/* --------------------------------------------------------------- utilities */

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function clientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
}

async function safeJson<T>(promise: Promise<T>): Promise<Partial<T>> {
  try {
    return await promise;
  } catch {
    return {};
  }
}

async function dbOf(env: Env) {
  try {
    return await ensureDb(env);
  } catch (error) {
    console.error("D1 unavailable", error);
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "SAMEORIGIN");
});

app.get("/api/health", async (c) => {
  const db = await dbOf(c.env);
  return c.json({ ok: true, db: Boolean(db), ai: aiConfigured(c.env), products: (await loadProducts(c.env)).length });
});

/* ---------------------------------------------------------------- products */

app.get("/api/products", async (c) => {
  const products = await loadProducts(c.env);
  return c.json({ products, categories: CATEGORY_LABELS });
});

app.get("/api/products/:id", async (c) => {
  const products = await loadProducts(c.env);
  const product = products.find((p) => p.id === c.req.param("id"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json({ product });
});

app.get("/api/price-history/:id", async (c) => {
  const products = await loadProducts(c.env);
  const product = products.find((p) => p.id === c.req.param("id"));
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json(priceHistory(product));
});

/* -------------------------------------------------------------------- auth */

app.get("/api/auth/providers", (c) =>
  c.json({
    google: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    password: true,
    ai: aiConfigured(c.env),
  }),
);

app.get("/api/auth/me", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  return c.json({ user });
});

app.post("/api/auth/register", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ error: "Accounts are unavailable right now." }, 503);
  if (!rateLimit(`reg:${clientKey(c)}`, 8, 60_000)) return c.json({ error: "Too many attempts, try again in a minute." }, 429);
  const body = await safeJson(c.req.json<{ email?: string; password?: string; name?: string }>());
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim() || email.split("@")[0];
  if (!EMAIL_RE.test(email)) return c.json({ error: "Enter a valid email address." }, 400);
  if (password.length < 8) return c.json({ error: "Password must be at least 8 characters." }, 400);

  const exists = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return c.json({ error: "That email already has an account. Try signing in." }, 409);

  const { user } = await upsertUser(db, { email, name, provider: "password", passwordHash: await hashPassword(password) });
  await createSession(c, db, user.id);
  return c.json({ user });
});

app.post("/api/auth/login", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ error: "Accounts are unavailable right now." }, 503);
  if (!rateLimit(`login:${clientKey(c)}`, 12, 60_000)) return c.json({ error: "Too many attempts, try again in a minute." }, 429);
  const body = await safeJson(c.req.json<{ email?: string; password?: string }>());
  const email = (body.email ?? "").trim().toLowerCase();
  const row = await db
    .prepare("SELECT id, email, name, provider, avatar_url, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; email: string; name: string; provider: "password" | "google"; avatar_url: string | null; password_hash: string | null }>();
  if (!row || !(await verifyPassword(body.password ?? "", row.password_hash))) {
    return c.json({ error: "Email or password is incorrect." }, 401);
  }
  await createSession(c, db, row.id);
  return c.json({ user: { id: row.id, email: row.email, name: row.name, provider: row.provider, avatarUrl: row.avatar_url } });
});

app.post("/api/auth/logout", async (c) => {
  const db = await dbOf(c.env);
  if (db) await endSession(c, db);
  return c.json({ ok: true });
});

app.get("/api/auth/google/start", async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.json({ error: "Google sign-in is not configured on this deployment yet." }, 501);
  }
  const state = uid("st");
  setCookie(c, "zyn_oauth_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: 600,
  });
  const origin = c.env.APP_ORIGIN || new URL(c.req.url).origin;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return c.redirect(url.toString());
});

app.get("/api/auth/google/callback", async (c) => {
  const db = await dbOf(c.env);
  const origin = c.env.APP_ORIGIN || new URL(c.req.url).origin;
  const fail = (reason: string) => c.redirect(`${origin}/auth?error=${encodeURIComponent(reason)}`);
  if (!db || !c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return fail("google_not_configured");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const expected = getCookie(c, "zyn_oauth_state");
  if (!code || !state || state !== expected) return fail("invalid_state");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("token_exchange_failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("no_access_token");
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return fail("profile_failed");
    const profile = (await profileRes.json()) as { email?: string; name?: string; picture?: string };
    if (!profile.email) return fail("no_email");

    const { user } = await upsertUser(db, {
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      provider: "google",
      avatarUrl: profile.picture ?? null,
    });
    await createSession(c, db, user.id);
    return c.redirect(`${origin}/assistant`);
  } catch (error) {
    console.error("google oauth failed", error);
    return fail("oauth_failed");
  }
});

/* ---------------------------------------------------------------- wishlist */

app.get("/api/wishlist", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db || !user) return c.json({ items: [] }, 200);
  const { results } = await db
    .prepare("SELECT product_id, created_at FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC")
    .bind(user.id)
    .all<{ product_id: string; created_at: number }>();
  return c.json({ items: (results ?? []).map((r) => ({ productId: r.product_id, addedAt: r.created_at })) });
});

app.post("/api/wishlist", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db || !user) return c.json({ error: "Sign in to sync your wishlist." }, 401);
  const { productId } = await c.req.json<{ productId?: string }>().catch(() => ({ productId: undefined }));
  const products = await loadProducts(c.env);
  if (!productId || !products.some((p) => p.id === productId)) return c.json({ error: "Unknown product." }, 400);
  await db
    .prepare("INSERT INTO wishlist_items (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, product_id) DO NOTHING")
    .bind(uid("wl"), user.id, productId, Date.now())
    .run();
  return c.json({ ok: true });
});

app.post("/api/wishlist/merge", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db || !user) return c.json({ error: "Sign in to sync your wishlist." }, 401);
  const { productIds } = await c.req.json<{ productIds?: string[] }>().catch(() => ({ productIds: [] }));
  const valid = new Set((await loadProducts(c.env)).map((p) => p.id));
  const ids = (productIds ?? []).filter((id) => valid.has(id)).slice(0, 200);
  const now = Date.now();
  if (ids.length) {
    await db.batch(
      ids.map((id) =>
        db
          .prepare("INSERT INTO wishlist_items (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, product_id) DO NOTHING")
          .bind(uid("wl"), user.id, id, now),
      ),
    );
  }
  const { results } = await db
    .prepare("SELECT product_id, created_at FROM wishlist_items WHERE user_id = ?")
    .bind(user.id)
    .all<{ product_id: string; created_at: number }>();
  return c.json({ items: (results ?? []).map((r) => ({ productId: r.product_id, addedAt: r.created_at })) });
});

app.delete("/api/wishlist/:productId", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db || !user) return c.json({ error: "Sign in to sync your wishlist." }, 401);
  await db
    .prepare("DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?")
    .bind(user.id, c.req.param("productId"))
    .run();
  return c.json({ ok: true });
});

/* ------------------------------------------------------------ price alerts */

app.get("/api/alerts", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db) return c.json({ alerts: [] });
  if (user) {
    const { results } = await db
      .prepare("SELECT product_id, target_price, created_at FROM price_alerts WHERE user_id = ?")
      .bind(user.id)
      .all<{ product_id: string; target_price: number; created_at: number }>();
    return c.json({ alerts: (results ?? []).map((r) => ({ productId: r.product_id, targetPrice: r.target_price, createdAt: r.created_at })) });
  }
  const guest = guestId(c);
  const { results } = await db
    .prepare("SELECT product_id, target_price, created_at FROM price_alerts WHERE guest_id = ?")
    .bind(guest)
    .all<{ product_id: string; target_price: number; created_at: number }>();
  return c.json({ alerts: (results ?? []).map((r) => ({ productId: r.product_id, targetPrice: r.target_price, createdAt: r.created_at })) });
});

app.post("/api/alerts", async (c) => {
  const body = await safeJson(c.req.json<{ productId?: string; targetPrice?: number }>());
  const products = await loadProducts(c.env);
  const product = products.find((p) => p.id === body.productId);
  if (!product) return c.json({ error: "Unknown product." }, 400);
  const target = Math.round(Number(body.targetPrice) || product.price * 0.9);
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db) return c.json({ ok: true, stored: "local" });
  const guest = user ? null : guestId(c);
  if (!user && !guest) return c.json({ error: "Session unavailable." }, 500);
  const alertId = uid("al");
  if (user) {
    await db
      .prepare(
        "INSERT INTO price_alerts (id, user_id, product_id, target_price, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET target_price = excluded.target_price",
      )
      .bind(alertId, user.id, product.id, target, Date.now())
      .run();
  } else {
    await db.batch([
      db.prepare("DELETE FROM price_alerts WHERE guest_id = ? AND product_id = ?").bind(guest, product.id),
      db
        .prepare("INSERT INTO price_alerts (id, guest_id, product_id, target_price, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(alertId, guest, product.id, target, Date.now()),
    ]);
  }
  return c.json({ ok: true, targetPrice: target });
});

app.delete("/api/alerts/:productId", async (c) => {
  const db = await dbOf(c.env);
  const user = await currentUser(c, db);
  if (!db) return c.json({ ok: true });
  if (user) {
    await db.prepare("DELETE FROM price_alerts WHERE user_id = ? AND product_id = ?").bind(user.id, c.req.param("productId")).run();
  } else {
    await db.prepare("DELETE FROM price_alerts WHERE guest_id = ? AND product_id = ?").bind(guestId(c), c.req.param("productId")).run();
  }
  return c.json({ ok: true });
});

/* ------------------------------------------------------------ chat history */

app.get("/api/chat/sessions", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ sessions: [] });
  const user = await currentUser(c, db);
  const guest = user ? null : guestId(c);
  const { results } = await db
    .prepare(
      user
        ? "SELECT id, title, language, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20"
        : "SELECT id, title, language, updated_at FROM chat_sessions WHERE guest_id = ? ORDER BY updated_at DESC LIMIT 20",
    )
    .bind(user ? user.id : guest)
    .all<{ id: string; title: string; language: string; updated_at: number }>();
  return c.json({ sessions: results ?? [] });
});

app.post("/api/chat/sessions", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ ok: false });
  const body = await safeJson(c.req.json<{ id?: string; title?: string; language?: string; messages?: unknown[] }>());
  const id = (body.id ?? "").slice(0, 64) || uid("chat");
  const messages = JSON.stringify((body.messages ?? []).slice(-40));
  const user = await currentUser(c, db);
  const guest = user ? null : guestId(c);
  const existing = await db.prepare("SELECT user_id, guest_id FROM chat_sessions WHERE id = ?").bind(id).first<{ user_id: string | null; guest_id: string | null }>();
  if (existing && !(existing.user_id && existing.user_id === user?.id) && !(existing.guest_id && existing.guest_id === guest)) {
    return c.json({ error: "Not your session." }, 403);
  }
  const now = Date.now();
  if (existing) {
    await db
      .prepare("UPDATE chat_sessions SET title = ?, language = ?, messages = ?, updated_at = ? WHERE id = ?")
      .bind((body.title ?? "Conversation").slice(0, 120), body.language ?? "en", messages, now, id)
      .run();
  } else {
    await db
      .prepare("INSERT INTO chat_sessions (id, user_id, guest_id, title, language, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, user?.id ?? null, guest, (body.title ?? "Conversation").slice(0, 120), body.language ?? "en", messages, now, now)
      .run();
  }
  return c.json({ id });
});

app.get("/api/chat/sessions/:id", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ error: "Unavailable" }, 503);
  const user = await currentUser(c, db);
  const row = await db
    .prepare("SELECT id, user_id, guest_id, title, language, messages FROM chat_sessions WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: string; user_id: string | null; guest_id: string | null; title: string; language: string; messages: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  const guest = user ? null : getCookie(c, GUEST_COOKIE);
  if (row.user_id && row.user_id !== user?.id) return c.json({ error: "Not found" }, 404);
  if (!row.user_id && row.guest_id && row.guest_id !== guest) return c.json({ error: "Not found" }, 404);
  return c.json({ session: { ...row, messages: JSON.parse(row.messages) } });
});

app.delete("/api/chat/sessions/:id", async (c) => {
  const db = await dbOf(c.env);
  if (!db) return c.json({ ok: true });
  const user = await currentUser(c, db);
  if (user) {
    await db.prepare("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?").bind(c.req.param("id"), user.id).run();
  } else {
    await db.prepare("DELETE FROM chat_sessions WHERE id = ? AND guest_id = ?").bind(c.req.param("id"), guestId(c)).run();
  }
  return c.json({ ok: true });
});

/* -------------------------------------------------------------------- chat */

app.post("/api/chat", async (c) => {
  if (!rateLimit(`chat:${clientKey(c)}`, 30, 60_000)) return c.json({ error: "Easy there — try again in a minute." }, 429);
  const body = await safeJson(
    c.req.json<{ messages?: { role: "user" | "assistant"; content: string }[]; language?: string; needs?: Needs | null; message?: string }>(),
  );
  const messages = Array.isArray(body.messages) && body.messages.length
    ? body.messages.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    : body.message
      ? [{ role: "user" as const, content: body.message }]
      : [];
  if (!messages.length) return c.json({ error: "Message is empty." }, 400);
  if (messages[messages.length - 1].content.length > 2000) return c.json({ error: "That message is too long." }, 413);

  const products = await loadProducts(c.env);
  const stream = await streamChat(c.env, products, {
    messages: messages.slice(-10),
    language: body.language ?? "en",
    needs: body.needs ?? null,
  });
  return chatResponse(stream);
});

app.post("/api/verdict", async (c) => {
  const body = await safeJson(c.req.json<{ productIds?: string[]; needs?: Partial<Needs> | null; language?: string }>());
  const products = await loadProducts(c.env);
  const chosen = (body.productIds ?? []).map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (chosen.length < 2) return c.json({ error: "Pick at least two products to compare." }, 400);
  const needs: Needs | null = body.needs
    ? {
        query: body.needs.query ?? "",
        category: body.needs.category ?? null,
        budget: body.needs.budget ?? null,
        tags: body.needs.tags ?? [],
        keywords: body.needs.keywords ?? [],
        confidence: body.needs.confidence ?? 0.5,
      }
    : null;
  const verdict = await compareVerdict(c.env, chosen, needs, body.language ?? "en");
  return c.json(verdict);
});

app.post("/api/vision", async (c) => {
  if (!rateLimit(`vision:${clientKey(c)}`, 10, 60_000)) return c.json({ error: "Too many image searches — try again shortly." }, 429);
  const body = await safeJson(c.req.json<{ image?: string; language?: string; hint?: string }>());
  const image = body.image ?? "";
  if (!image.startsWith("data:image/")) return c.json({ error: "Send a JPG or PNG image." }, 400);
  if (image.length > 2_600_000) return c.json({ error: "That image is too large — use one under 2 MB." }, 413);

  const products = await loadProducts(c.env);
  const result = await visionSearch(c.env, image, body.language ?? "en", body.hint ?? "");
  const needs = result.needs;
  const matches = rankProducts(needs, { limit: 4, catalogue: products, onlyCategory: Boolean(needs.category) });
  return c.json({ needs, note: result.note, source: result.source, matches });
});

app.onError((error, c) => {
  console.error("unhandled worker error", error);
  return c.json({ error: "Something went wrong on our side." }, 500);
});

/* ---------------------------------------------------------------- frontend */

app.all("*", async (c) => {
  const assets = c.env.ASSETS;
  if (!assets) return c.text("Not found", 404);
  const url = new URL(c.req.url);
  const response = await assets.fetch(new Request(url.toString(), c.req.raw));
  if (response.status === 404) {
    const index = await assets.fetch(new URL("/index.html", url).toString());
    if (index.ok) {
      return new Response(index.body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  }
  return response;
});

export default app;
