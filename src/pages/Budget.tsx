import { ArrowUpRight, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES, type Category, type Needs } from "@shared/types";
import { CATEGORY_LABELS } from "@shared/catalogue";
import { scoreProduct, valueScore } from "@shared/scoring";
import { useStore } from "@/lib/store";
import { cn, inr, shortInr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, GlassCard, SectionHeading, Input, Select, Skeleton } from "@/components/ui/primitives";
import { RangeSlider } from "@/components/ui/overlay";
import { MatchRing } from "@/components/MatchRing";
import { ProductDrawer } from "@/components/ProductDrawer";

const MAX_BUDGET = 200000;

function ScatterChart({
  points,
  budget,
}: {
  points: { product: string; price: number; rating: number; within: boolean }[];
  budget: number;
}) {
  if (!points.length) return null;
  const width = 640;
  const height = 260;
  const pad = { left: 44, right: 16, top: 16, bottom: 34 };
  const maxPrice = Math.max(budget * 1.12, ...points.map((p) => p.price)) * 1.02;
  const minRating = 3.2;
  const x = (price: number) => pad.left + (price / maxPrice) * (width - pad.left - pad.right);
  const y = (rating: number) => pad.top + (1 - (rating - minRating) / (5 - minRating)) * (height - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Scatter chart of price versus rating for the budget results">
      {[3.5, 4, 4.5, 5].map((rating) => (
        <g key={rating}>
          <line x1={pad.left} x2={width - pad.right} y1={y(rating)} y2={y(rating)} stroke="rgba(255,255,255,0.09)" strokeDasharray="3 4" />
          <text x={pad.left - 8} y={y(rating) + 3} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.9)">
            {rating.toFixed(1)}
          </text>
        </g>
      ))}
      <line x1={x(budget)} x2={x(budget)} y1={pad.top} y2={height - pad.bottom} stroke="#34d399" strokeDasharray="4 4" strokeOpacity="0.7" />
      <text x={x(budget) + 4} y={pad.top + 8} fontSize="9" fill="#34d399">
        budget {shortInr(budget)}
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <text key={ratio} x={x(maxPrice * ratio)} y={height - 14} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">
          {shortInr(Math.round((maxPrice * ratio) / 1000) * 1000)}
        </text>
      ))}
      {points.map((point, index) => (
        <g key={`${point.product}-${index}`}>
          <circle cx={x(point.price)} cy={y(point.rating)} r={6} fill={point.within ? "#ff8a3d" : "#8b5cf6"} fillOpacity={0.85} stroke="rgba(255,255,255,0.5)" strokeWidth="0.8">
            <title>{`${point.product} — ${inr(point.price)} · ★${point.rating}`}</title>
          </circle>
        </g>
      ))}
      <text x={pad.left} y={height - 2} fontSize="9" fill="rgba(148,163,184,0.9)">
        price →
      </text>
      <text x={width - pad.right} y={height - 2} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.9)">
        rating ↑
      </text>
    </svg>
  );
}

export default function BudgetPage() {
  const { products, productsLoading, needs } = useStore();
  const [category, setCategory] = useState<Category | "all">("laptops");
  const [budget, setBudget] = useState(60000);
  const [budgetInput, setBudgetInput] = useState("60000");
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const requestNeeds: Needs = useMemo(
    () => ({
      ...(needs ?? { query: "", category: null, budget: null, tags: [], keywords: [], confidence: 0 }),
      category: category === "all" ? null : category,
      budget,
    }),
    [budget, category, needs],
  );

  const pool = useMemo(
    () => products.filter((product) => (category === "all" ? true : product.category === category)),
    [category, products],
  );

  const within = useMemo(
    () =>
      pool
        .filter((product) => product.price <= budget)
        .map((product) => ({ product, scored: scoreProduct(product, requestNeeds), value: valueScore(product, requestNeeds) }))
        .sort((a, b) => b.value - a.value),
    [pool, budget, requestNeeds],
  );

  const above = useMemo(
    () =>
      pool
        .filter((product) => product.price > budget && product.price <= budget * 1.1)
        .map((product) => ({ product, scored: scoreProduct(product, requestNeeds), diff: product.price - budget }))
        .sort((a, b) => a.diff - b.diff),
    [pool, budget, requestNeeds],
  );

  const chartPoints = useMemo(
    () =>
      [...within.map((entry) => ({ ...entry, within: true })), ...above.map((entry) => ({ ...entry, within: false }))].map((entry) => ({
        product: entry.product.name,
        price: entry.product.price,
        rating: entry.product.rating,
        within: entry.within,
      })),
    [above, within],
  );

  const applyBudget = (value: number) => {
    const clamped = Math.max(1000, Math.min(MAX_BUDGET, Math.round(value)));
    setBudget(clamped);
    setBudgetInput(String(clamped));
  };

  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Budget assistant"
        title="What can your budget buy?"
        description="Pick a category and a budget. We rank what fits by value, and show what a 10% stretch would add."
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <GlassCard className="space-y-5 p-4">
          <div>
            <label htmlFor="budget-category" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <Select id="budget-category" value={category} onChange={(event) => setCategory(event.target.value as Category | "all")}>
              <option value="all">All categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="budget-amount" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your budget (₹)
            </label>
            <Input
              id="budget-amount"
              type="number"
              inputMode="numeric"
              min={1000}
              max={MAX_BUDGET}
              step={500}
              value={budgetInput}
              onChange={(event) => {
                setBudgetInput(event.target.value);
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 1000) setBudget(Math.min(MAX_BUDGET, value));
              }}
              onBlur={() => applyBudget(Number(budgetInput) || budget)}
            />
            <div className="mt-3">
              <RangeSlider label="Drag to set budget" min={1000} max={MAX_BUDGET} step={1000} value={Math.min(budget, MAX_BUDGET)} onValueChange={applyBudget} format={inr} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[15000, 30000, 60000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyBudget(preset)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition",
                    budget === preset ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {shortInr(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-white/[0.03] p-3 text-[11.5px] leading-relaxed text-muted-foreground">
            <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
              <Wallet className="h-3 w-3 text-primary" aria-hidden /> How value works
            </p>
            Value blends the match score with how comfortably the price sits under your budget, so a great product at 90% of budget can beat a mediocre one at 40%.
          </div>
        </GlassCard>

        <div className="space-y-5">
          {productsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <>
              <section aria-label="Within budget">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold">
                    Within budget <span className="text-muted-foreground">({within.length})</span>
                  </h2>
                  <Badge tone="success">≤ {inr(budget)}</Badge>
                </div>
                {within.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="h-5 w-5" />}
                    title="Nothing fits this budget"
                    description={`No ${category === "all" ? "products" : CATEGORY_LABELS[category].toLowerCase()} under ${inr(budget)}. Try raising the budget a little.`}
                    action={<Button variant="outline" onClick={() => applyBudget(budget * 1.25)}>Increase to {inr(budget * 1.25)}</Button>}
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {within.slice(0, 8).map(({ product, scored, value }) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => setOpenProductId(product.id)}
                          className="glass card-hover flex w-full items-center gap-3 rounded-2xl p-3 text-left"
                        >
                          <MatchRing score={scored.score} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{product.name}</p>
                            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">{scored.reasons[0]}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">★ {product.rating.toFixed(1)}</span>
                              <span aria-hidden>·</span>
                              <span>value {value}</span>
                              {product.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-display text-sm font-semibold text-primary">{inr(product.price)}</p>
                            <p className="text-[10.5px] text-emerald-400/90">{inr(budget - product.price)} left</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {above.length ? (
                <section aria-label="Just above budget">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-display text-sm font-semibold">Just above budget</h2>
                    <Badge tone="warning">up to 10% over</Badge>
                  </div>
                  <ul className="space-y-2.5">
                    {above.slice(0, 5).map(({ product, scored, diff }) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => setOpenProductId(product.id)}
                          className="glass flex w-full items-center gap-3 rounded-2xl border border-amber-500/25 p-3 text-left transition hover:border-amber-400/50"
                        >
                          <MatchRing score={scored.score} size={44} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{product.name}</p>
                            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground">{scored.reasons[0]}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-display text-sm font-semibold">{inr(product.price)}</p>
                            <p className="inline-flex items-center gap-0.5 text-[10.5px] text-amber-300">
                              <ArrowUpRight className="h-2.5 w-2.5" aria-hidden /> +{inr(diff)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <GlassCard className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold">Price vs rating</h2>
                  <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-primary" /> within budget
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-secondary" /> stretch
                    </span>
                  </div>
                </div>
                <ScatterChart points={chartPoints} budget={budget} />
              </GlassCard>
            </>
          )}
        </div>
      </div>

      <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
    </div>
  );
}
