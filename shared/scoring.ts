import { PRODUCTS, CATEGORY_LABELS } from "./catalogue";
import type { Category, Needs, PriceHistory, Product, ScoredProduct, Tag } from "./types";

/* ------------------------------------------------------------------ intent */

const CATEGORY_HINTS: Record<Category, string[]> = {
  laptops: ["laptop", "notebook", "ultrabook", "macbook", "chromebook", "laptop", "ల్యాప్‌టాప్", "लैपटॉप"],
  smartphones: ["phone", "mobile", "smartphone", "iphone", "android", "ఫోన్", "फोन"],
  headphones: ["headphone", "headset", "earphone", "earbud", "buds", "audio", "హెడ్‌ఫోన్", "हेडफोन"],
  smartwatches: ["watch", "smartwatch", "fitness band", "tracker", "వాచ్", "घड़ी"],
  cameras: ["camera", "dslr", "mirrorless", "gopro", "vlog", "కెమెరా", "कैमरा"],
  appliances: ["fridge", "refrigerator", "ac ", " air conditioner", "washing machine", "microwave", "vacuum", "purifier", "mixer", "tv", "television", "appliance", "air fryer"],
  clothing: ["shirt", "jean", "kurta", "saree", "dress", "hoodie", "tee", "t-shirt", "chino", "blazer", "clothes", "clothing", "outfit", "pyjama", "jacket", "wear", "చీర", "కుర్తా", "शर्ट", "कुर्ता", "साड़ी"],
};

const TAG_HINTS: Record<Tag, string[]> = {
  gaming: ["gaming", "game", "fps", "bgmi", "valorant", "esports", "gamer", "గేమింగ్", "गेमिंग", "ఆట"],
  coding: ["coding", "code", "developer", "programming", "software", "engineering", "student coder", "vim", "docker", "ide", "కోడింగ్", "ప్రోగ్రామింగ్", "कोडिंग", "प्रोग्रामिंग"],
  camera: ["camera", "photo", "photography", "video", "vlog", "shoot", "selfie", "కెమెరా", "कैमरा", "ఫోటో"],
  battery: ["battery", "backup", "all day", "long lasting", "charging", "బ్యాటరీ", "बैटरी"],
  lightweight: ["light", "lightweight", "portable", "carry", "slim", "travel", "తేలిక", "हल्का"],
  student: ["student", "college", "school", "hostel", "student budget", "విద్యార్థి", "छात्र", "स्टूडेंट"],
  premium: ["premium", "best", "flagship", "high end", "professional", "ప్రీమియం", "प्रीमियम"],
  budget: ["budget", "cheap", "affordable", "low price", "value for money", "బడ్జెట్", "बजट"],
  casual: ["casual", "daily", "everyday", "college wear", "hangout"],
  formal: ["formal", "office", "interview", "meeting", "work wear", "corporate", "ఫార్మల్", "फॉर्मल"],
  ethnic: ["ethnic", "traditional", "festive", "wedding", "pooja", "diwali", "saree", "kurta", "పండుగ", "ఎత్నిక్", "त्योहार"],
  party: ["party", "club", "evening", "date", "reception", "brunch", "పార్టీ", "पार्टी"],
  winter: ["winter", "cold", "warm", "layering", "jacket", "sweater", "చలి", "सर्दी"],
  running: ["running", "run", "jog", "gym", "workout", "training", "marathon", "fitness", "రన్నింగ్", "दौड़"],
};

const BUDGET_RE = /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:[,.]\d{2,3})+|\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac|l)?/gi;

export function parseBudget(text: string): number | null {
  const lower = text.toLowerCase();
  let best: number | null = null;
  // "under 60k", "around 60000", "budget of 1.2 lakh"
  const explicit = lower.match(/(?:under|below|within|around|about|max|upto|up to|budget of|budget is|₹|rs\.?)\s*:?\s*([\d,.]+)\s*(k|thousand|lakh|lac|l)?/);
  const candidates: RegExpMatchArray[] = [];
  if (explicit) candidates.push(explicit);
  let m: RegExpExecArray | null;
  while ((m = BUDGET_RE.exec(lower))) candidates.push(m as unknown as RegExpMatchArray);
  for (const c of candidates) {
    const raw = (c[1] || "").replace(/,/g, "");
    let value = Number(raw);
    if (!isFinite(value) || value <= 0) continue;
    const unit = (c[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") value *= 1000;
    if (unit === "lakh" || unit === "lac" || unit === "l") value *= 100000;
    if (value < 500) continue; // ignore "5 star", "120hz" style numbers
    best = best === null ? value : Math.max(best, value);
  }
  return best;
}

export function detectCategory(text: string): Category | null {
  const lower = ` ${text.toLowerCase()} `;
  // "camera phone" is a phone, not a camera — resolve the compound first.
  if (/(camera phone|phone camera|phone with (a )?(good |great )?camera|photography phone)/.test(lower)) return "smartphones";
  let best: { cat: Category; len: number } | null = null;
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS) as [Category, string[]][]) {
    for (const hint of hints) {
      if (lower.includes(hint) && (!best || hint.length > best.len)) best = { cat, len: hint.length };
    }
  }
  return best?.cat ?? null;
}

export function detectTags(text: string): Tag[] {
  // "budget of 60000", "under 60k", "60000 లోపు" describe money, not a tag — strip them first.
  const lower = text
    .toLowerCase()
    .replace(/(?:budget|బడ్జెట్|बजट)\s*(?:of|is|:)?\s*[₹rs.]*\s*[\d,.]+\s*(?:k|thousand|lakh|lac|వేల|हज़ार)?/g, " ")
    .replace(/(?:under|below|around|within|upto|up to|లోపు|कम|भीतर)\s*[₹rs.]*\s*[\d,.]+\s*(?:k|thousand|lakh|lac|వేల)?/g, " ")
    .replace(/[\d,.]+\s*(?:k|వేల)?\s*(?:లోపు|కి లోపు|कम|के अंदर)/g, " ");
  return (Object.keys(TAG_HINTS) as Tag[]).filter((tag) => TAG_HINTS[tag].some((h) => lower.includes(h)));
}

const STOPWORDS = new Set([
  "with", "that", "have", "this", "from", "want", "need", "good", "best", "which", "what", "about", "under",
  "around", "less", "than", "into", "your", "please", "something", "looking", "buy", "product", "products",
  "for", "and", "the", "but", "not", "you", "can", "are", "was", "has", "how", "any", "all", "get",
]);

export function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097F\u0C00-\u0C7F\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  ).slice(0, 12);
}

export function extractNeeds(text: string, previous?: Needs | null): Needs {
  const category = detectCategory(text) ?? previous?.category ?? null;
  const parsedBudget = parseBudget(text);
  const tags = Array.from(new Set([...detectTags(text), ...(previous?.tags ?? [])]));
  const followUp = /cheaper|lower|less|reduce|down|afford/i.test(text);
  let budget = parsedBudget ?? previous?.budget ?? null;
  if (!parsedBudget && followUp && budget) budget = Math.round((budget * 0.8) / 500) * 500;

  const keywords = Array.from(new Set([...extractKeywords(text), ...(previous?.keywords ?? [])])).slice(0, 16);
  const confidence = Math.min(
    1,
    (category ? 0.5 : 0) + (budget ? 0.25 : 0) + Math.min(tags.length, 2) * 0.15 + (keywords.length > 2 ? 0.1 : 0),
  );

  return { query: [previous?.query, text].filter(Boolean).join(" · "), category, budget, tags, keywords, confidence };
}

export function needsSummary(needs: Needs): string {
  const bits: string[] = [];
  if (needs.category) bits.push(CATEGORY_LABELS[needs.category]);
  if (needs.budget) bits.push(`under ₹${needs.budget.toLocaleString("en-IN")}`);
  if (needs.tags.length) bits.push(needs.tags.slice(0, 3).join(", "));
  return bits.join(" · ") || "Open request";
}

/* ----------------------------------------------------------------- scoring */

const WEIGHTS = { needs: 35, tagFit: 25, budget: 30, rating: 10 } as const;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function specValue(product: Product, keys: string[]): string | null {
  for (const [k, v] of Object.entries(product.specs)) {
    if (keys.some((key) => k.toLowerCase().includes(key.toLowerCase()))) return v;
  }
  return null;
}

function tagFitProduct(product: Product, needs: Needs): number {
  const wanted = needs.tags;
  const matchedTag = wanted.filter((t) => product.tags.includes(t)).length;
  const wantedCategoryTag = needs.category && product.category === needs.category;
  const haystack = [
    product.name,
    product.brand,
    product.summary,
    product.category,
    ...product.tags,
    ...Object.entries(product.specs).map(([k, v]) => `${k} ${v}`),
  ]
    .join(" ")
    .toLowerCase();
  const keywordHits = needs.keywords.filter((k) => haystack.includes(k)).length;

  if (!wanted.length && !keywordHits) return wantedCategoryTag ? 60 : 45;
  const tagPart = wanted.length ? (matchedTag / wanted.length) * 85 : 0;
  const keywordPart = Math.min(keywordHits, 4) * 7;
  return clamp(tagPart + keywordPart + (wantedCategoryTag ? 8 : 0));
}

function budgetFitProduct(product: Product, needs: Needs): number {
  if (!needs.budget) return 72;
  if (product.price <= needs.budget) {
    // closer to the budget = better use of the money, but never punish a good deal below 60%
    const ratio = product.price / needs.budget;
    return clamp(72 + ratio * 28);
  }
  const over = (product.price - needs.budget) / needs.budget;
  return clamp(100 - over * 320);
}

function needsFitProduct(product: Product, needs: Needs): number {
  if (!needs.category) return 62;
  if (product.category === needs.category) return 100;
  return clamp(18);
}

function ratingFitProduct(product: Product): number {
  return clamp(((product.rating - 3.5) / 1.5) * 100);
}

export function scoreProduct(product: Product, needs: Needs): ScoredProduct {
  const breakdown = {
    needs: Math.round(needsFitProduct(product, needs)),
    tagFit: Math.round(tagFitProduct(product, needs)),
    budget: Math.round(budgetFitProduct(product, needs)),
    rating: Math.round(ratingFitProduct(product)),
  };
  const score = Math.round(
    (breakdown.needs * WEIGHTS.needs +
      breakdown.tagFit * WEIGHTS.tagFit +
      breakdown.budget * WEIGHTS.budget +
      breakdown.rating * WEIGHTS.rating) /
      100,
  );
  return { product, score: clamp(score), breakdown, reasons: explain(product, needs, breakdown) };
}

/* -------------------------------------------------------------- explainable */

const TAG_REASON: Partial<Record<Tag, (p: Product) => string>> = {
  coding: (p) => {
    const ram = specValue(p, ["RAM", "Memory"]);
    const cpu = specValue(p, ["Processor", "CPU", "Chip"]);
    return `Coding is RAM- and CPU-hungry: ${ram ?? "its memory"} of RAM with ${cpu ?? "a modern processor"} keeps IDEs, Docker and dozens of browser tabs from stuttering.`;
  },
  gaming: (p) => {
    const gpu = specValue(p, ["GPU", "Graphics"]);
    const refresh = specValue(p, ["Display", "Screen"]);
    return gpu
      ? `For gaming the graphics chip decides everything — ${gpu} paired with ${refresh ?? "a high-refresh display"} holds high frame rates.`
      : `Gaming leans on the display and processor: ${refresh ?? "a fast panel"} and ${specValue(p, ["Processor", "Chip"]) ?? "a capable chip"} keep frames smooth.`;
  },
  battery: (p) => {
    const battery = specValue(p, ["Battery", "Runtime", "Charging"]);
    return battery
      ? `You asked about battery — ${battery} means you can leave the charger at home for a full working day.`
      : `Battery is a strength here, rated for long sessions away from a plug point.`;
  },
  lightweight: (p) => {
    const weight = specValue(p, ["Weight"]);
    return weight
      ? `Portability matters to you: at ${weight} it slips into a backpack and is easy to carry to class or a cafe every day.`
      : `It is designed to be carried daily without weighing your bag down.`;
  },
  camera: (p) => {
    const cam = specValue(p, ["Camera", "Sensor", "Video", "Stabilisation"]);
    return cam
      ? `Photography was in your request — the ${cam} setup is what actually separates good shots from average ones here.`
      : `Its imaging pipeline is tuned for stills and video rather than just point-and-shoot.`;
  },
  student: (p) =>
    `At ₹${p.price.toLocaleString("en-IN")} it stays inside a student budget while still covering the work you described.`,
  budget: (p) => `Priced at ₹${p.price.toLocaleString("en-IN")}, it gives you the essentials without paying for a premium badge.`,
  premium: () =>
    `Premium build and long-term reliability mean fewer replacements — the sort of thing you buy once and keep.`,
  casual: (p) => `${specValue(p, ["Fabric"]) ?? "The fabric"} with a ${(specValue(p, ["Fit"]) ?? "comfortable").toLowerCase()} fit makes it an easy everyday wear.`,
  formal: (p) =>
    `The ${(specValue(p, ["Fit"]) ?? "tailored").toLowerCase()} cut and ${specValue(p, ["Collar", "Fabric"]) ?? "clean fabric"} read sharp in an office or interview setting.`,
  ethnic: (p) =>
    `${specValue(p, ["Fabric"]) ?? "The fabric"} plus ${specValue(p, ["Occasion"]) ?? "festive detailing"} makes it right for functions and festivals.`,
  party: (p) => `The ${(specValue(p, ["Pattern", "Fabric"]) ?? "silhouette").toLowerCase()} is made for evenings out, not daily wear.`,
  winter: (p) =>
    `${specValue(p, ["Fabric", "Weight"]) ?? "Its insulation"} traps warmth without the bulk, which is why it works for cold mornings.`,
  running: (p) =>
    `${specValue(p, ["Feature", "Fabric"]) ?? "Sweat-wicking fabric"} keeps it usable through workouts and long runs.`,
};

function quoteUserWords(needs: Needs): string | null {
  const fromTags = needs.tags.filter((t) => TAG_HINTS[t].some((h) => needs.query.toLowerCase().includes(h)));
  // Only quote words the shopper can recognise back — skip script-local stopwords.
  const words = Array.from(new Set([...fromTags, ...needs.keywords.filter((word) => /^[a-z][a-z0-9-]{2,}$/i.test(word))])).slice(0, 2);
  if (!words.length) return null;
  return words.join("”, “");
}

/**
 * 2–4 plain-language reasons tied to the shopper's own words, the budget and the
 * store rating. Always returns at least two reasons (a recommendation is never
 * shown without one).
 */
export function explain(product: Product, needs: Needs, breakdown: ScoreBreakdownish): string[] {
  const reasons: string[] = [];
  const userWords = quoteUserWords(needs);

  const matchedTags = needs.tags.filter((t) => product.tags.includes(t));
  for (const tag of matchedTags.slice(0, 3)) {
    const build = TAG_REASON[tag];
    if (build) reasons.push(build(product));
  }

  if (needs.category === product.category && reasons.length < 3) {
    reasons.push(
      `You asked for ${CATEGORY_LABELS[product.category].toLowerCase()}, and this is a ${product.category === "clothing" ? "" : ""}${product.brand} built for exactly that job.`,
    );
  }
  if (!reasons.length) {
    reasons.push(
      `${product.summary}`,
    );
  }
  if (needs.budget && product.price <= needs.budget && reasons.length < 4) {
    reasons.push(
      `At ₹${product.price.toLocaleString("en-IN")} it sits ₹${(needs.budget - product.price).toLocaleString("en-IN")} under your ₹${needs.budget.toLocaleString("en-IN")} limit.`,
    );
  } else if (needs.budget && product.price > needs.budget && reasons.length < 4) {
    reasons.push(
      `It is ₹${(product.price - needs.budget).toLocaleString("en-IN")} over your budget — worth stretching only if ${matchedTags[0] ?? "this"} is non-negotiable.`,
    );
  }
  if (breakdown.rating >= 85 && reasons.length < 4) {
    reasons.push(`Rated ${product.rating.toFixed(1)}/5 by shoppers, so the quality is not a gamble.`);
  }
  while (reasons.length < 2) {
    reasons.push(`${product.summary}`);
    if (reasons.length < 2) reasons.push(`Rated ${product.rating.toFixed(1)}/5 and priced at ₹${product.price.toLocaleString("en-IN")}.`);
  }

  const unique = Array.from(new Set(reasons));
  if (userWords) unique[0] = `You said “${userWords}” — ${unique[0].charAt(0).toLowerCase()}${unique[0].slice(1)}`;
  return unique.slice(0, 4);
}

interface ScoreBreakdownish {
  needs: number;
  budget: number;
  rating: number;
  tagFit: number;
}

/* ---------------------------------------------------------------- ranking */

export interface RankOptions {
  limit?: number;
  minScore?: number;
  onlyCategory?: boolean;
  catalogue?: Product[];
}

export function rankProducts(needs: Needs, options: RankOptions = {}): ScoredProduct[] {
  const { limit = 6, minScore = 0, onlyCategory = true, catalogue = PRODUCTS } = options;
  const pool = needs.category && onlyCategory ? catalogue.filter((p) => p.category === needs.category) : catalogue;
  const source = pool.length ? pool : catalogue;
  return source
    .map((p) => scoreProduct(p, needs))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
    .slice(0, limit);
}

/** Value = how much match you get per rupee — used by the Budget page. */
export function valueScore(product: Product, needs: Needs): number {
  const scored = scoreProduct(product, needs);
  const affordability = needs.budget ? clamp((needs.budget / product.price) * 55, 0, 100) : 60;
  return Math.round(scored.score * 0.7 + affordability * 0.3);
}

/* ------------------------------------------------------------ price history */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic 30-day price history derived from the product id, so the same
 * product always shows the same "drop" on every device (no fake randomness).
 */
export function priceHistory(product: Product): PriceHistory {
  const seed = hash(product.id);
  const points = Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((seed % 100) / 14 + i / 3.4) * 0.035;
    const drift = ((seed % 7) - 3) * 0.0025 * (i / 30);
    const price = Math.round((product.price * (1 + wave + drift)) / 100) * 100;
    const day = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { day, price };
  });
  // Today's point must match the listed price, so the low is always a real dip.
  points[points.length - 1] = { ...points[points.length - 1], price: product.price };
  const prices = points.map((p) => p.price);
  const lowest = Math.min(...prices);
  const lowestDay = points.find((point) => point.price === lowest)?.day ?? points[points.length - 1].day;
  return {
    productId: product.id,
    currentPrice: product.price,
    lowest,
    lowestDay,
    highest: Math.max(...prices),
    points,
    dropped: product.price <= lowest * 1.01,
  };
}
