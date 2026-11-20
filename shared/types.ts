export const CATEGORIES = [
  "laptops",
  "smartphones",
  "headphones",
  "smartwatches",
  "cameras",
  "appliances",
  "clothing",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TAGS = [
  "gaming",
  "coding",
  "camera",
  "battery",
  "lightweight",
  "student",
  "premium",
  "budget",
  "casual",
  "formal",
  "ethnic",
  "party",
  "winter",
  "running",
] as const;

export type Tag = (typeof TAGS)[number];

export type Specs = Record<string, string>;

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  rating: number;
  tags: Tag[];
  specs: Specs;
  summary: string;
  colors?: string[];
  sizes?: string[];
}

export interface Needs {
  query: string;
  category: Category | null;
  budget: number | null;
  tags: Tag[];
  keywords: string[];
  /** 0..1 — how sure we are the request is specific enough to recommend */
  confidence: number;
}

export interface ScoreBreakdown {
  needs: number;
  budget: number;
  rating: number;
  tagFit: number;
}

export interface ScoredProduct {
  product: Product;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface Recommendation extends ScoredProduct {
  aiReason?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
  needs?: Needs | null;
  at: number;
}

export interface ChatResult {
  message: string;
  needs: Needs;
  recommendations: Recommendation[];
  clarifyingQuestion?: string | null;
  source: "llm" | "rules";
}

export interface Verdict {
  summary: string;
  pros: string[];
  cons: string[];
  pick: { productId: string; reason: string } | null;
  source: "llm" | "rules";
}

export interface WishlistRow {
  productId: string;
  addedAt: number;
}

export interface PriceAlert {
  productId: string;
  targetPrice: number;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  provider: "password" | "google";
  avatarUrl?: string | null;
}

export interface PricePoint {
  day: string;
  price: number;
}

export interface PriceHistory {
  productId: string;
  currentPrice: number;
  lowest: number;
  /** Day the lowest price was reached, ISO yyyy-mm-dd */
  lowestDay: string;
  highest: number;
  points: PricePoint[];
  dropped: boolean;
}
