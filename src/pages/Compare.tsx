import { ListOrdered, Loader2, Sparkles, Star, TrendingDown, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { needsSummary, priceHistory, scoreProduct } from "@shared/scoring";
import type { Product, Verdict } from "@shared/types";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn, inr, shortDay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { Badge, EmptyState, GlassCard, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ProductDrawer } from "@/components/ProductDrawer";
import { useToast } from "@/components/Toaster";

function numericValue(value: string): number | null {
  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function isLowerBetter(key: string): boolean {
  return /price|weight|noise/i.test(key);
}

function bestIndex(values: (string | null)[], keys: string[]): number {
  let best = -1;
  let bestValue: number | null = null;
  values.forEach((value, index) => {
    if (value == null) return;
    const number = numericValue(value);
    if (number == null) return;
    const better = bestValue == null || (isLowerBetter(keys[index]) ? number < bestValue : number > bestValue);
    if (better) {
      best = index;
      bestValue = number;
    }
  });
  return best;
}

export default function ComparePage() {
  const { compare, products, toggleCompare, clearCompare, needs, language } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictBusy, setVerdictBusy] = useState(false);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const selected = compare.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p));

  useEffect(() => {
    if (compare.length < 2) setVerdict(null);
  }, [compare.length]);

  const scoredMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof scoreProduct>>();
    for (const product of selected) {
      map.set(product.id, scoreProduct(product, needs ?? { query: "", category: product.category, budget: null, tags: [], keywords: [], confidence: 0 }));
    }
    return map;
  }, [needs, selected]);

  const specKeys = useMemo(() => {
    const keys: string[] = [];
    for (const product of selected) {
      for (const key of Object.keys(product.specs)) if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [selected]);

  const ranked = useMemo(
    () =>
      selected
        .map((product) => ({ product, scored: scoredMap.get(product.id)!, history: priceHistory(product) }))
        .sort((a, b) => b.scored.score - a.scored.score || b.product.rating - a.product.rating),
    [selected, scoredMap],
  );

  const lowestInGroup = useMemo(
    () => (ranked.length ? Math.min(...ranked.map((entry) => entry.history.lowest)) : 0),
    [ranked],
  );

  const askVerdict = async () => {
    setVerdictBusy(true);
    try {
      const result = await api.verdict(selected.map((p) => p.id), needs, language);
      setVerdict(result);
    } catch (error) {
      push({ title: "Verdict failed", description: (error as Error).message, variant: "error" });
    } finally {
      setVerdictBusy(false);
    }
  };

  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  if (selected.length < 2) {
    return (
      <div className="space-y-5">
        <SectionHeading
          eyebrow="Side by side"
          title="Compare 2–4 products"
          description="Add products from anywhere in Zynqart. We highlight the best value in every row, then explain the trade-offs."
        />
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title={selected.length === 0 ? "Nothing to compare yet" : "Add one more product"}
          description="Tap the compare icon on any product card, or start from a popular shortlist below."
          action={
            <Button onClick={() => navigate("/explore")}>Browse the catalogue</Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {products.slice(0, 3).map((product) => (
            <GlassCard key={product.id} className="flex items-center gap-3 p-3">
              <ProductImage product={product} className="h-11 w-11 shrink-0 rounded-xl" showBrand={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{product.name}</p>
                <p className="text-[11px] text-muted-foreground">{inr(product.price)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggleCompare(product.id)}>
                Add
              </Button>
            </GlassCard>
          ))}
        </div>
        <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
      </div>
    );
  }

  const rows: { label: string; values: (string | null)[]; keys: string[] }[] = [
    { label: "Price", values: selected.map((p) => String(p.price)), keys: selected.map(() => "price") },
    { label: "Rating", values: selected.map((p) => `${p.rating} / 5`), keys: selected.map(() => "rating") },
    { label: "Match for your needs", values: selected.map((p) => `${scoredMap.get(p.id)?.score ?? 0}%`), keys: selected.map(() => "score") },
    ...specKeys.map((key) => ({
      label: key,
      values: selected.map((p) => p.specs[key] ?? null),
      keys: selected.map(() => key),
    })),
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Side by side"
        title="Compare your shortlist"
        description="Best value in each row is highlighted. Ask the assistant for a verdict on your stated needs."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearCompare}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
            </Button>
            <Button size="sm" onClick={() => void askVerdict()} disabled={verdictBusy}>
              {verdictBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              AI verdict
            </Button>
          </div>
        }
      />

      {needs ? (
        <p className="text-xs text-muted-foreground">
          Judging against: <span className="font-medium text-foreground">{needsSummary(needs)}</span>
        </p>
      ) : null}

      <GlassCard className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold">
            <ListOrdered className="h-4 w-4 text-secondary" aria-hidden /> Order after comparing
          </h2>
          <Badge tone="primary">Best match first</Badge>
        </div>
        <ol className="space-y-2">
          {ranked.map(({ product, scored, history }, index) => {
            const position = index + 1;
            const pctBelow = Math.round(((product.price - history.lowest) / product.price) * 100);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setOpenProductId(product.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition",
                    position === 1
                      ? "border-emerald-500/40 bg-emerald-500/8 hover:border-emerald-400/60"
                      : "border-border/60 bg-white/[0.02] hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                      position === 1 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06] text-muted-foreground",
                    )}
                    aria-label={`Rank ${position}`}
                  >
                    {position}
                  </span>
                  <ProductImage product={product} className="h-14 w-20 shrink-0 rounded-xl" showBrand={false} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                      {product.name}
                      {position === 1 ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                          <Trophy className="h-2.5 w-2.5" aria-hidden /> top pick
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {product.brand} · ★ {product.rating.toFixed(1)}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-emerald-300/90">
                      <TrendingDown className="h-2.5 w-2.5" aria-hidden /> Lowest reached {inr(history.lowest)} on {shortDay(history.lowestDay)} ({pctBelow}% below today)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-semibold text-primary">{inr(product.price)}</p>
                    <p className="text-[10.5px] text-muted-foreground">{scored.score}% match</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </GlassCard>

      <div className="glass sticky top-16 z-20 -mx-1 overflow-x-auto rounded-2xl p-1">
        <div className="flex min-w-max gap-2">
          {selected.map((product) => {
            const scored = scoredMap.get(product.id);
            return (
              <div key={product.id} className="flex w-56 shrink-0 items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
                <ProductImage product={product} className="h-10 w-10 shrink-0 rounded-lg" showBrand={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {inr(product.price)} · {scored?.score}% match
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCompare(product.id)}
                  aria-label={`Remove ${product.name}`}
                  className="rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <caption className="sr-only">Product comparison table with best values highlighted</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card/95 w-40 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                Feature
              </th>
              {selected.map((product) => (
                <th key={product.id} scope="col" className="px-4 py-3 text-left align-bottom">
                  <button type="button" onClick={() => setOpenProductId(product.id)} className="block text-left">
                    <ProductImage product={product} className="mb-2 h-16 w-full rounded-xl" showBrand={false} />
                    <span className="block font-display text-[13px] font-semibold leading-snug hover:text-primary">{product.name}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {product.brand} · {product.category}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const best = bestIndex(row.values, row.keys);
              const distinct = new Set(row.values.filter((v): v is string => v != null));
              return (
                <tr key={row.label} className={cn(rowIndex % 2 === 0 ? "bg-white/[0.02]" : "")}>
                  <th scope="row" className="sticky left-0 z-10 bg-card/95 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground backdrop-blur">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => {
                    const isBest = distinct.size > 1 && index === best;
                    return (
                      <td
                        key={`${row.label}-${index}`}
                        className={cn(
                          "px-4 py-2.5 text-[12.5px]",
                          isBest && "bg-emerald-500/12 font-semibold text-emerald-300",
                          value == null && "text-muted-foreground/50",
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {value == null ? "—" : row.label === "Price" ? inr(selected[index].price) : value}
                          {isBest ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 text-[9px] font-semibold uppercase tracking-wide">
                              <Trophy className="h-2.5 w-2.5" aria-hidden /> best
                            </span>
                          ) : null}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-card/95 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground backdrop-blur">
                Lowest price reached
              </th>
              {selected.map((product) => {
                const history = priceHistory(product);
                const isLowest = history.lowest === lowestInGroup;
                const pctBelow = Math.round(((product.price - history.lowest) / product.price) * 100);
                return (
                  <td
                    key={product.id}
                    className={cn("px-4 py-2.5", isLowest && "bg-emerald-500/12")}
                  >
                    <span className={cn("block text-[12.5px] font-semibold", isLowest ? "text-emerald-300" : "text-foreground")}>
                      {inr(history.lowest)}
                    </span>
                    <span className="block text-[10.5px] text-muted-foreground">
                      {shortDay(history.lowestDay)} · {pctBelow}% below today
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-secondary" aria-hidden /> AI verdict
          </h2>
          {verdict ? <Badge tone={verdict.source === "llm" ? "success" : "warning"}>{verdict.source === "llm" ? "LLM" : "Rule-based"}</Badge> : null}
        </div>

        {verdictBusy ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : verdict ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="leading-relaxed text-muted-foreground">{verdict.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Pros</p>
                <ul className="space-y-1 text-[12.5px] text-muted-foreground">
                  {verdict.pros.map((pro, index) => (
                    <li key={index} className="flex gap-1.5">
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-400">Cons</p>
                <ul className="space-y-1 text-[12.5px] text-muted-foreground">
                  {verdict.cons.map((con, index) => (
                    <li key={index} className="flex gap-1.5">
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {verdict.pick ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12.5px]">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Star className="h-3 w-3 fill-current" aria-hidden /> Pick
                </span>{" "}
                <span className="font-medium">{selected.find((p) => p.id === verdict.pick?.productId)?.name}</span> — {verdict.pick.reason}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Get a short pros-and-cons summary and a recommendation for your stated needs.
          </p>
        )}
      </GlassCard>

      <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
    </div>
  );
}
