import type {
  ChatResult,
  Needs,
  PriceAlert,
  Product,
  Recommendation,
  SessionUser,
  Verdict,
  WishlistRow,
} from "@shared/types";
import type { ScoredProduct } from "@shared/types";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
    ...init,
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!response.ok) throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  return data as T;
}

export const api = {
  products: () => jsonFetch<{ products: Product[] }>("/api/products"),
  me: () => jsonFetch<{ user: SessionUser | null }>("/api/auth/me"),
  providers: () => jsonFetch<{ google: boolean; password: boolean; ai: boolean }>("/api/auth/providers"),
  login: (email: string, password: string) =>
    jsonFetch<{ user: SessionUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    jsonFetch<{ user: SessionUser }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  logout: () => jsonFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  wishlist: () => jsonFetch<{ items: WishlistRow[] }>("/api/wishlist"),
  addWish: (productId: string) => jsonFetch<{ ok: boolean }>("/api/wishlist", { method: "POST", body: JSON.stringify({ productId }) }),
  removeWish: (productId: string) => jsonFetch<{ ok: boolean }>(`/api/wishlist/${productId}`, { method: "DELETE" }),
  mergeWishlist: (productIds: string[]) =>
    jsonFetch<{ items: WishlistRow[] }>("/api/wishlist/merge", { method: "POST", body: JSON.stringify({ productIds }) }),
  alerts: () => jsonFetch<{ alerts: PriceAlert[] }>("/api/alerts"),
  addAlert: (productId: string, targetPrice: number) =>
    jsonFetch<{ ok: boolean; targetPrice?: number }>("/api/alerts", { method: "POST", body: JSON.stringify({ productId, targetPrice }) }),
  removeAlert: (productId: string) => jsonFetch<{ ok: boolean }>(`/api/alerts/${productId}`, { method: "DELETE" }),
  verdict: (productIds: string[], needs: Needs | null, language: string) =>
    jsonFetch<Verdict>("/api/verdict", { method: "POST", body: JSON.stringify({ productIds, needs, language }) }),
  vision: (image: string, language: string, hint: string) =>
    jsonFetch<{ needs: Needs; note: string; source: "llm" | "rules"; matches: ScoredProduct[] }>("/api/vision", {
      method: "POST",
      body: JSON.stringify({ image, language, hint }),
    }),
  saveSession: (payload: { id: string; title: string; language: string; messages: unknown[] }) =>
    jsonFetch<{ id: string }>("/api/chat/sessions", { method: "POST", body: JSON.stringify(payload) }),
  sessions: () => jsonFetch<{ sessions: { id: string; title: string; language: string; updated_at: number }[] }>("/api/chat/sessions"),
};

export interface StreamHandlers {
  onDelta?(text: string): void;
  onResult?(result: ChatResult): void;
  onMeta?(source: "llm" | "rules"): void;
  onError?(message: string): void;
}

/**
 * Consumes the Worker's SSE stream. The assistant text arrives token by token;
 * the structured payload (needs + ranked products) arrives in a final `result`
 * event, so cards render inline the moment the answer completes.
 */
export async function streamChat(
  payload: { messages: { role: "user" | "assistant"; content: string }[]; language: string; needs?: Needs | null },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "The assistant is unavailable right now.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as {
          type: string;
          text?: string;
          payload?: ChatResult;
          message?: string;
          source?: "llm" | "rules";
        };
        if (event.type === "delta" && event.text) handlers.onDelta?.(event.text);
        if (event.type === "meta" && event.source) handlers.onMeta?.(event.source);
        if (event.type === "result" && event.payload) handlers.onResult?.(event.payload);
        if (event.type === "error" && event.message) handlers.onError?.(event.message);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

export type { ChatResult, Recommendation };
