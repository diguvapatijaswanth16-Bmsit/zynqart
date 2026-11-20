import { BellRing, GitCompareArrows, Heart, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { priceHistory, scoreProduct } from "@shared/scoring";
import type { Product } from "@shared/types";
import { Modal } from "./ui/overlay";
import { Badge, Input } from "./ui/primitives";
import { Button } from "./ui/button";
import { MatchRing } from "./MatchRing";
import { WhyPanel } from "./WhyPanel";
import { cn, inr, shortDay } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { useToast } from "./Toaster";

export function ProductDrawer({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { needs, isSaved, toggleWishlist, compare, toggleCompare, addAlert, alerts, removeAlert } = useStore();
  const { push } = useToast();
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (product) setTarget(String(Math.round(product.price * 0.9)));
  }, [product]);

  const scored = useMemo(() => (product ? scoreProduct(product, needs ?? { query: "", category: product.category, budget: null, tags: [], keywords: [], confidence: 0 }) : null), [product, needs]);
  const history = useMemo(() => (product ? priceHistory(product) : null), [product]);
  const alert = product ? alerts.find((a) => a.productId === product.id) : undefined;

  if (!product || !scored) return null;
  const saved = isSaved(product.id);
  const inCompare = compare.includes(product.id);

  return (
    <Modal open={Boolean(product)} onOpenChange={(open) => (!open ? onClose() : undefined)} title={product.name} description={`${product.brand} · ${product.category}`}>
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "#1b1b2e" }}>
          <ProductImage product={product} className="pointer-events-none absolute inset-y-0 right-0 w-3/5 opacity-55" showBrand={false} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#151524] via-[#151524]/85 to-transparent" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/80">{product.brand}</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-white">{product.name}</h2>
              <p className="mt-2 text-2xl font-semibold text-white">{inr(product.price)}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/90">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden />
                {product.rating.toFixed(1)} / 5 · {product.tags.join(" · ")}
              </p>
            </div>
            <div className="rounded-full bg-black/30 p-1.5 backdrop-blur">
              <MatchRing score={scored.score} size={64} />
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{product.summary}</p>

        {product.colors?.length || product.sizes?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {product.colors?.length ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Colours</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {product.sizes?.length ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sizes</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((s) => (
                    <Badge key={s} tone="primary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <WhyPanel reasons={scored.reasons} breakdown={scored.breakdown} defaultOpen />

        <div>
          <h3 className="mb-2 font-display text-sm font-semibold">Full specifications</h3>
          <dl className="overflow-hidden rounded-2xl border border-border/60">
            {Object.entries(product.specs).map(([key, value], index) => (
              <div
                key={key}
                className={cn("grid grid-cols-[minmax(0,40%)_1fr] gap-3 px-3.5 py-2.5 text-sm", index % 2 === 0 ? "bg-white/[0.03]" : "")}
              >
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {history ? (
          <div className="rounded-2xl border border-border/60 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <BellRing className="h-3.5 w-3.5 text-primary" aria-hidden /> Price watch
              </span>
              {history.dropped ? <Badge tone="success">At its lowest</Badge> : null}
            </div>
            <dl className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</dt>
                <dd className="text-[13px] font-semibold">{inr(product.price)}</dd>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-emerald-300/90">Lowest reached</dt>
                <dd className="text-[13px] font-semibold text-emerald-300">{inr(history.lowest)}</dd>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">30-day high</dt>
                <dd className="text-[13px] font-semibold">{inr(history.highest)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {history.dropped
                ? `Today's ${inr(product.price)} is the lowest this product has been in 30 days.`
                : `${inr(history.lowest)} was the lowest price reached, on ${shortDay(history.lowestDay)} — ${Math.round(
                    ((product.price - history.lowest) / product.price) * 100,
                  )}% below today's price.`}
            </p>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-label="Target price in rupees"
                className="sm:max-w-[10rem]"
              />
              {alert ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    void removeAlert(product.id);
                    push({ title: "Price alert removed" });
                  }}
                >
                  Remove alert (₹{alert.targetPrice.toLocaleString("en-IN")})
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const value = Number(target);
                    if (!Number.isFinite(value) || value <= 0) {
                      push({ title: "Enter a valid target price", variant: "error" });
                      return;
                    }
                    void addAlert(product, value);
                  }}
                >
                  Alert me at this price
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant={saved ? "outline" : "default"} onClick={() => void toggleWishlist(product)}>
            <Heart className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
            {saved ? "Saved to wishlist" : "Add to wishlist"}
          </Button>
          <Button variant={inCompare ? "secondary" : "outline"} onClick={() => toggleCompare(product.id)}>
            <GitCompareArrows className="h-4 w-4" aria-hidden />
            {inCompare ? "In comparison" : "Add to compare"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
