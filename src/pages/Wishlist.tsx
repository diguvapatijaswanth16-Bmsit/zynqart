import { ArrowDownUp, BellRing, GitCompareArrows, Heart, LogIn, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { priceHistory, scoreProduct } from "@shared/scoring";
import { useStore } from "@/lib/store";
import { cn, inr, productArt } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, GlassCard, SectionHeading } from "@/components/ui/primitives";
import { ProductDrawer } from "@/components/ProductDrawer";

export default function WishlistPage() {
  const { products, wishlist, toggleWishlist, toggleCompare, user, alerts, removeAlert, needs } = useStore();
  const navigate = useNavigate();
  const [sortDesc, setSortDesc] = useState(false);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const saved = useMemo(() => {
    const list = wishlist.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    return list.sort((a, b) => (sortDesc ? b.price - a.price : a.price - b.price));
  }, [products, sortDesc, wishlist]);

  const alertRows = useMemo(
    () =>
      alerts
        .map((alert) => {
          const product = products.find((p) => p.id === alert.productId);
          return product ? { alert, product } : null;
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    [alerts, products],
  );

  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Saved for later"
        title="Your wishlist"
        description={
          user
            ? "Synced to your Zynqart account, so it follows you across devices."
            : "Saved on this device. Sign in and it merges into your account automatically."
        }
        action={
          <div className="flex items-center gap-2">
            {user ? (
              <Badge tone="success">Synced · {user.email}</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
                <LogIn className="h-3.5 w-3.5" aria-hidden /> Sign in to sync
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSortDesc((v) => !v)} aria-label="Toggle price sort order">
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden /> {sortDesc ? "Price ↓" : "Price ↑"}
            </Button>
          </div>
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-5 w-5" />}
          title="No saved products yet"
          description="Tap the heart on any product card while you browse — it stays here even before you sign in."
          action={<Button onClick={() => navigate("/explore")}>Explore products</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((product) => {
            const scored = scoreProduct(product, needs ?? { query: "", category: product.category, budget: null, tags: [], keywords: [], confidence: 0 });
            return (
              <li key={product.id}>
                <GlassCard className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => setOpenProductId(product.id)}
                    className="shrink-0 overflow-hidden rounded-xl"
                    aria-label={`View ${product.name}`}
                  >
                    <ProductImage product={product} className="h-14 w-14" showBrand={false} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => setOpenProductId(product.id)} className="truncate text-left text-[13px] font-medium hover:text-primary">
                      {product.name}
                    </button>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {product.brand} · ★ {product.rating.toFixed(1)} · {scored.score}% match
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-primary">{inr(product.price)}</p>
                    <p className="text-[10.5px] text-emerald-300/85">Lowest reached {inr(priceHistory(product).lowest)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`Add ${product.name} to comparison`}
                      onClick={() => toggleCompare(product.id)}
                    >
                      <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${product.name} from wishlist`}
                      className="text-rose-300 hover:bg-rose-500/15"
                      onClick={() => void toggleWishlist(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-label="Price-drop alerts" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Price-drop alerts</h2>
            <p className="text-xs text-muted-foreground">
              Set a target from any product drawer. We compare it with the listed price and the 30-day low.
            </p>
          </div>
          <Badge tone={alertRows.length ? "primary" : "default"}>{alertRows.length} tracked</Badge>
        </div>

        {alertRows.length === 0 ? (
          <GlassCard className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellRing className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-sm font-medium">No price alerts yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Open a product and use “Alert me at this price” — good for phones and laptops that move fast.
            </p>
          </GlassCard>
        ) : (
          <ul className="space-y-2">
            {alertRows.map(({ alert, product }) => {
              const met = product.price <= alert.targetPrice;
              const gap = product.price - alert.targetPrice;
              return (
                <li key={alert.productId}>
                  <GlassCard className={cn("flex flex-wrap items-center gap-3 p-3", met && "border-emerald-500/40")}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: productArt(product).gradient }}>
                      <span aria-hidden className="text-sm">{productArt(product).glyph}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => setOpenProductId(product.id)} className="truncate text-left text-[13px] font-medium hover:text-primary">
                        {product.name}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        Target {inr(alert.targetPrice)} · now {inr(product.price)}
                      </p>
                    </div>
                    {met ? (
                      <Badge tone="success">
                        <BellRing className="h-3 w-3" aria-hidden /> At your price
                      </Badge>
                    ) : (
                      <Badge tone="warning">{inr(gap)} to go</Badge>
                    )}
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove alert for ${product.name}`} onClick={() => void removeAlert(product.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </GlassCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
    </div>
  );
}
