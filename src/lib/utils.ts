import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product } from "@shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function shortInr(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `₹${value}`;
}

/** Deterministic, dependency-free artwork instead of stock photos. */
export function productArt(product: Product): { gradient: string; glyph: string } {
  const palettes: Record<string, [string, string]> = {
    laptops: ["#3b2a6b", "#8b5cf6"],
    smartphones: ["#123a5c", "#38bdf8"],
    headphones: ["#4a2340", "#f472b6"],
    smartwatches: ["#1f3b34", "#34d399"],
    cameras: ["#4a3020", "#fb923c"],
    appliances: ["#23324a", "#60a5fa"],
    clothing: ["#4b2a34", "#fb7185"],
  };
  const [a, b] = palettes[product.category] ?? ["#2a2a4a", "#8b5cf6"];
  const hash = product.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const angle = 110 + (hash % 90);
  const glyphs: Record<string, string> = {
    laptops: "💻",
    smartphones: "📱",
    headphones: "🎧",
    smartwatches: "⌚",
    cameras: "📷",
    appliances: "🏠",
    clothing: "👕",
  };
  return {
    gradient: `linear-gradient(${angle}deg, ${a} 0%, ${b} 92%)`,
    glyph: glyphs[product.category] ?? "✦",
  };
}

export type ProductArtKind =
  | "laptop"
  | "phone"
  | "headphones"
  | "watch"
  | "camera"
  | "tv"
  | "fridge"
  | "washer"
  | "ac"
  | "vacuum"
  | "appliance"
  | "tee"
  | "pants"
  | "dress";

/** Which line illustration matches this product (appliances and clothing vary a lot). */
export function productArtKind(product: Product): ProductArtKind {
  switch (product.category) {
    case "laptops":
      return "laptop";
    case "smartphones":
      return "phone";
    case "headphones":
      return "headphones";
    case "smartwatches":
      return "watch";
    case "cameras":
      return "camera";
    case "appliances": {
      const name = product.name.toLowerCase();
      if (/tv|television/.test(name)) return "tv";
      if (/fridge|refrigerator/.test(name)) return "fridge";
      if (/washer|washing/.test(name)) return "washer";
      if (/\bac\b|conditioner|split/.test(name)) return "ac";
      if (/vacuum|dyson/.test(name)) return "vacuum";
      return "appliance";
    }
    case "clothing": {
      const name = product.name.toLowerCase();
      if (/jean|chino|trouser|pyjama|palazzo/.test(name)) return "pants";
      if (/saree|dress|kurti|kurta/.test(name)) return "dress";
      return "tee";
    }
    default:
      return "appliance";
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-04" -> "4 Nov" (parsed as parts to avoid timezone drift). */
export function shortDay(day: string): string {
  const [, month, date] = day.split("-").map(Number);
  if (!month || !date) return day;
  return `${date} ${MONTHS[month - 1] ?? ""}`.trim();
}

export function scoreTone(score: number): { label: string; className: string; stroke: string } {
  if (score >= 85) return { label: "Excellent match", className: "text-emerald-300", stroke: "#34d399" };
  if (score >= 70) return { label: "Strong match", className: "text-primary", stroke: "#ff8a3d" };
  if (score >= 55) return { label: "Possible match", className: "text-amber-300", stroke: "#fbbf24" };
  return { label: "Weak match", className: "text-muted-foreground", stroke: "#94a3b8" };
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
