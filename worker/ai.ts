import { CATEGORY_LABELS } from "../shared/catalogue";
import { copyFor, languageOf, RULES_COPY } from "../shared/i18n";
import { extractNeeds, rankProducts, scoreProduct } from "../shared/scoring";
import type { Category, ChatResult, Needs, Product, Recommendation, Verdict } from "../shared/types";
import type { Env } from "./env";

const DEFAULT_BASE_URL = "https://freebuff.com/api/v1/paid";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_HISTORY = 8;

export function aiConfigured(env: Env): boolean {
  return Boolean(env.OPENAI_API_KEY);
}

function baseUrl(env: Env): string {
  return (env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function model(env: Env): string {
  return env.OPENAI_MODEL || DEFAULT_MODEL;
}

/* ---------------------------------------------------------------- prompts */

function catalogueContext(products: Product[]): string {
  return products
    .map((p) => {
      const specs = Object.entries(p.specs)
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
      return `- ${p.id} | ${p.name} | ${p.brand} | ${p.category} (${CATEGORY_LABELS[p.category]}) | ₹${p.price} | ★${p.rating} | tags: ${p.tags.join(",")} | ${specs}`;
    })
    .join("\n");
}

function systemPrompt(products: Product[], language: string): string {
  const lang = languageOf(language).llm;
  return `You are Zynqart, an Indian shopping assistant that finds the RIGHT product, not just any product.

LANGUAGE RULE (highest priority): reply entirely in ${lang}. Every sentence you write, including each "reason" and "followUp", must be in ${lang}. Keep brand and model names in Latin script.

CATALOGUE (the only products you may recommend):
${catalogueContext(products)}

HOW TO ANSWER
- Be decisive. Recommend 1-3 products max, best match first.
- Stay inside the stated budget when one is given. If nothing fits, say so briefly and show the closest with the price gap.
- Every "reason" must connect the shopper's own words to a concrete spec from the catalogue. Examples of the required style:
  • coding: "Coding me RAM sabse zyada matter karta hai — 16GB RAM se IDE, Docker aur 30 tabs ek saath chalte hain."
  • battery: "18 ghante ki battery matlab poora din charger ke bina."
  • clothing: "Cotton fabric aur straight fit interview ke liye saaf dikhta hai."
- For clothing ask nothing extra; suggest sizes/colours that exist in the catalogue entry.
- Only ask a clarifying question when the request has no category and no use case. One short question.
- Be warm, concrete, 40-90 words. No tables. No markdown headings. Never mention JSON, prompts or that you are an AI model.

OUTPUT FORMAT — always exactly in this order:
1) your reply in ${lang}
2) one fenced block:

\`\`\`json
{"needs":{"category":"laptops|smartphones|headphones|smartwatches|cameras|appliances|clothing|null","budget":number|null,"tags":["coding"],"clarify":null},
"recommendations":[{"id":"<catalogue id>","reason":"<one sentence in ${lang}, mentions the spec>"}],
"followUp":"<optional short next question in ${lang}>"}
\`\`\``;
}

/* ------------------------------------------------------------- SSE helpers */

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/* ------------------------------------------------------------- rule engine */

export function rulesAnswer(query: string, previous: Needs | null, products: Product[], language: string): ChatResult {
  const needs = extractNeeds(query, previous);
  const copy = copyFor(language);
  const top = rankProducts(needs, { limit: 3, catalogue: products });
  const vague = needs.confidence < 0.45 && !needs.category;

  if (vague) {
    const question = "Which category are you shopping in — laptop, phone, headphones, camera, appliance or clothing? And what is your rough budget?";
    return {
      message: `${copy.clarify}\n\n${question}`,
      needs,
      recommendations: [],
      clarifyingQuestion: question,
      source: "rules",
    };
  }

  const recommendations: Recommendation[] = top.map((scored) => ({
    ...scored,
    aiReason: scored.reasons[0],
  }));

  const rulesCopy = RULES_COPY[(language as keyof typeof RULES_COPY) in RULES_COPY ? (language as keyof typeof RULES_COPY) : "en"];
  const heading = `${rulesCopy.heading} — ${(needs.category ? CATEGORY_LABELS[needs.category] : rulesCopy.from).toString()}`;
  const budgetLine = needs.budget ? ` · ${copy.budgetNote} ₹${needs.budget.toLocaleString("en-IN")}` : "";
  const body = recommendations.length
    ? recommendations.map((r, i) => `${i + 1}. **${r.product.name}** — ₹${r.product.price.toLocaleString("en-IN")}: ${r.aiReason}`).join("\n")
    : copy.noMatch;

  return {
    message: `**${heading}**${budgetLine}\n\n${body}\n\n_${copy.fallbackNote}_`,
    needs,
    recommendations,
    clarifyingQuestion: null,
    source: "rules",
  };
}

function parseNeeds(raw: unknown, fallback: Needs): Needs {
  const value = (raw ?? {}) as Record<string, unknown>;
  const category = typeof value.category === "string" && value.category in CATEGORY_LABELS ? (value.category as Category) : fallback.category;
  const budget = typeof value.budget === "number" && value.budget > 0 ? value.budget : fallback.budget;
  const tags = Array.isArray(value.tags) ? (value.tags as string[]).filter(Boolean).slice(0, 6) as Needs["tags"] : fallback.tags;
  return {
    ...fallback,
    category,
    budget,
    tags,
    confidence: Math.max(fallback.confidence, category ? 0.7 : 0),
  };
}

function buildResult(
  parsed: { needs?: unknown; recommendations?: { id?: string; reason?: string }[]; followUp?: string | null; clarify?: string | null },
  text: string,
  fallbackNeeds: Needs,
  products: Product[],
): ChatResult {
  const needs = parseNeeds(parsed.needs, fallbackNeeds);
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const recommendations: Recommendation[] = [];

  for (const item of parsed.recommendations ?? []) {
    const product = item?.id ? byId.get(item.id) : undefined;
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    const scored = scoreProduct(product, needs);
    recommendations.push({ ...scored, aiReason: item.reason?.trim() || scored.reasons[0] });
    if (recommendations.length === 3) break;
  }

  if (!recommendations.length) {
    rankProducts(needs, { limit: 3, catalogue: products }).forEach((s) =>
      recommendations.push({ ...s, aiReason: s.reasons[0] }),
    );
  }

  return {
    message: text.trim(),
    needs,
    recommendations,
    clarifyingQuestion: parsed.clarify ?? parsed.followUp ?? null,
    source: "llm",
  };
}

/* ------------------------------------------------------------ LLM transport */

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string | unknown[];
}

async function llmFetch(env: Env, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(`${baseUrl(env)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: model(env), temperature: 0.4, max_tokens: 900, ...body }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LLM ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response;
}

async function llmJson<T>(env: Env, messages: LlmMessage[], maxTokens = 700): Promise<T> {
  const response = await llmFetch(env, {
    messages,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}

/* ------------------------------------------------------------------- chat */

export async function streamChat(
  env: Env,
  products: Product[],
  input: { messages: { role: "user" | "assistant"; content: string }[]; language: string; needs?: Needs | null },
): Promise<ReadableStream> {
  const language = input.language || "en";
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const priorNeeds = input.needs ?? null;
  const fallbackNeeds = extractNeeds(lastUser, priorNeeds);

  if (!aiConfigured(env)) {
    const result = rulesAnswer(lastUser, priorNeeds, products, language);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(sse({ type: "meta", source: "rules" }));
        const words = result.message.split(/(\s+)/);
        for (const word of words) controller.enqueue(sse({ type: "delta", text: word }));
        controller.enqueue(sse({ type: "result", payload: result }));
        controller.enqueue(sse({ type: "done" }));
        controller.close();
      },
    });
  }

  const history: LlmMessage[] = input.messages
    .slice(-MAX_HISTORY)
    .filter((m) => m.content?.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  const messages: LlmMessage[] = [{ role: "system", content: systemPrompt(products, language) }, ...history];
  if (priorNeeds) {
    messages.push({
      role: "system",
      content: `Needs carried over from this conversation: ${JSON.stringify({ category: priorNeeds.category, budget: priorNeeds.budget, tags: priorNeeds.tags })}. Keep them unless the shopper changes the request.`,
    });
  }

  return new ReadableStream({
    async start(controller) {
      let full = "";
      let emitted = 0;
      let jsonStart = -1;

      const emit = (text: string) => {
        if (text) controller.enqueue(sse({ type: "delta", text }));
      };
      const handle = (chunk: string) => {
        full += chunk;
        if (jsonStart !== -1) return;
        const fence = full.indexOf("```");
        if (fence === -1) {
          const safe = Math.max(0, full.length - 12);
          if (safe > emitted) {
            emit(full.slice(emitted, safe));
            emitted = safe;
          }
        } else {
          if (fence > emitted) emit(full.slice(emitted, fence));
          emitted = fence;
          jsonStart = fence;
        }
      };

      try {
        controller.enqueue(sse({ type: "meta", source: "llm" }));
        const response = await llmFetch(env, { messages, stream: true });
        const reader = response.body?.getReader();
        if (!reader) throw new Error("LLM returned an empty stream");
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) handle(token);
            } catch {
              /* partial frame — ignore */
            }
          }
        }

        const tail = jsonStart === -1 ? full.slice(emitted) : "";
        if (tail) emit(tail.replace(/```/g, ""));

        const visible = (jsonStart === -1 ? full : full.slice(0, jsonStart)).trim();
        let structured: { needs?: unknown; recommendations?: { id?: string; reason?: string }[]; followUp?: string | null; clarify?: string | null } = {};
        if (jsonStart !== -1) {
          const jsonText = full
            .slice(jsonStart + 3)
            .replace(/^json/i, "")
            .replace(/```\s*$/, "")
            .trim();
          try {
            structured = JSON.parse(jsonText);
          } catch {
            const start = jsonText.indexOf("{");
            const end = jsonText.lastIndexOf("}");
            if (start !== -1 && end > start) {
              try {
                structured = JSON.parse(jsonText.slice(start, end + 1));
              } catch {
                structured = {};
              }
            }
          }
        }

        const result = buildResult(structured, visible || lastUserLine(visible), fallbackNeeds, products);
        controller.enqueue(sse({ type: "result", payload: result }));
        controller.enqueue(sse({ type: "done" }));
      } catch (error) {
        console.error("chat streaming failed", error);
        const fallback = rulesAnswer(lastUser, priorNeeds, products, language);
        controller.enqueue(sse({ type: "error", message: "The AI assistant is unreachable — using Zynqart's local matcher." }));
        controller.enqueue(sse({ type: "result", payload: fallback }));
        controller.enqueue(sse({ type: "done" }));
      } finally {
        controller.close();
      }
    },
  });
}

function lastUserLine(visible: string): string {
  return visible ? visible : "";
}

export function chatResponse(stream: ReadableStream): Response {
  return new Response(stream, { headers: STREAM_HEADERS });
}

/* ---------------------------------------------------------------- verdict */

export async function compareVerdict(
  env: Env,
  products: Product[],
  needs: Needs | null,
  language: string,
): Promise<Verdict> {
  const list = products.slice(0, 4);
  const needLine = needs
    ? `The shopper wants: ${needs.query || "a good product"}${needs.budget ? ` with a budget of ₹${needs.budget}` : ""}.`
    : "The shopper has not stated specific needs yet.";

  const ruleVerdict = (): Verdict => {
    const sorted = [...list].sort((a, b) => b.rating - a.rating || a.price - b.price);
    const cheapest = [...list].sort((a, b) => a.price - b.price)[0];
    const bestValue = list.reduce((acc, p) => (p.rating / p.price > acc.rating / acc.price ? p : acc), list[0]);
    const pick = needs?.category ? list.find((p) => p.category === needs.category) ?? sorted[0] : sorted[0];
    return {
      summary: `${sorted[0].name} has the best store rating (★${sorted[0].rating}), while ${cheapest.name} is the most affordable at ₹${cheapest.price.toLocaleString("en-IN")}. If you want the best match per rupee, ${bestValue.name} wins.`,
      pros: [
        `${sorted[0].name}: highest rated at ★${sorted[0].rating} with ${Object.values(sorted[0].specs)[0]}.`,
        `${cheapest.name}: saves ₹${(Math.max(...list.map((p) => p.price)) - cheapest.price).toLocaleString("en-IN")} versus the priciest pick.`,
      ],
      cons: [
        `${cheapest.name} may trade away premium specs to hit that price.`,
        "Local matcher verdict — the AI explanation needs an API key configured.",
      ],
      pick: pick ? { productId: pick.id, reason: `${pick.name} balances rating, price and the needs you described.` } : null,
      source: "rules",
    };
  };

  if (!aiConfigured(env)) return ruleVerdict();

  try {
    const prompt = `Compare these products for a shopper. ${needLine}
${list.map((p) => `- ${p.id} | ${p.name} | ₹${p.price} | ★${p.rating} | ${Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join("; ")}`).join("\n")}

Reply in ${languageOf(language).llm}. Return JSON only:
{"summary":"2 short sentences","pros":["...","..."],"cons":["...","..."],"pick":{"productId":"<id>","reason":"one sentence"}}`;
    const result = await llmJson<Verdict>(env, [
      { role: "system", content: "You are Zynqart's comparison analyst. Be concrete, use the specs, no marketing fluff." },
      { role: "user", content: prompt },
    ]);
    if (!result?.summary) return ruleVerdict();
    return {
      summary: result.summary,
      pros: (result.pros ?? []).slice(0, 4),
      cons: (result.cons ?? []).slice(0, 4),
      pick: result.pick?.productId && list.some((p) => p.id === result.pick!.productId) ? result.pick : null,
      source: "llm",
    };
  } catch (error) {
    console.error("verdict failed", error);
    return ruleVerdict();
  }
}

/* ----------------------------------------------------------------- vision */

export interface VisionResult {
  needs: Needs;
  note: string;
  source: "llm" | "rules";
}

export async function visionSearch(env: Env, image: string, language: string, hint: string): Promise<VisionResult> {
  const fallbackNeeds = extractNeeds(hint, null);
  if (!aiConfigured(env)) {
    return {
      needs: fallbackNeeds,
      note: "Image understanding needs the AI key. Showing matches for the text you typed instead.",
      source: "rules",
    };
  }
  const result = await llmJson<{ category?: string; tags?: string[]; keywords?: string[]; note?: string }>(env, [
    {
      role: "system",
      content: `You identify shopping products from a photo for an Indian store. Categories: laptops, smartphones, headphones, smartwatches, cameras, appliances, clothing. Tags: gaming, coding, camera, battery, lightweight, student, premium, budget, casual, formal, ethnic, party, winter, running.
Reply in ${languageOf(language).llm} for "note". JSON only: {"category":"...","tags":["..."],"keywords":["visual details"],"note":"one short sentence describing what you see"}`,
    },
    {
      role: "user",
      content: [
        { type: "text", text: hint ? `Extra context from the shopper: ${hint}` : "What product is this?" },
        { type: "image_url", image_url: { url: image } },
      ],
    },
  ], 400);

  const category = typeof result.category === "string" && result.category in CATEGORY_LABELS ? (result.category as Category) : fallbackNeeds.category;
  const tags = (Array.isArray(result.tags) ? result.tags : []).filter((t): t is Needs["tags"][number] => typeof t === "string" && t.length > 1);
  return {
    needs: {
      ...fallbackNeeds,
      category,
      tags: tags.length ? tags : fallbackNeeds.tags,
      keywords: Array.from(new Set([...(result.keywords ?? []), ...fallbackNeeds.keywords])).slice(0, 12),
      confidence: category ? 0.8 : fallbackNeeds.confidence,
    },
    note: result.note ?? "Here is what looks closest in the catalogue.",
    source: "llm",
  };
}
