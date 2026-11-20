import { motion } from "framer-motion";
import { GitCompareArrows, Heart, Star } from "lucide-react";
import type { Recommendation, ScoredProduct } from "@shared/types";
import { Badge, Card, Skeleton } from "./ui/primitives";
import { Button } from "./ui/button";
import { MatchRing } from "./MatchRing";
import { WhyPanel } from "./WhyPanel";
import { cn, inr } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";

export function ProductCard({
  scored,
  onOpen,
  index = 0,
  showWhy = true,
}: {
  scored: ScoredProduct | Recommendation;
  onOpen: (productId: string) => void;
  index?: number;
  showWhy?: boolean;
}) {
  const { product, score, breakdown, reasons } = scored;
  const aiReason = "aiReason" in scored ? scored.aiReason : undefined;
  const { isSaved, toggleWishlist, compare, toggleCompare } = useStore();
  const saved = isSaved(product.id);
  const inCompare = compare.includes(product.id);
  const topReason = aiReason || reasons[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
      className="glass card-hover group flex h-full flex-col overflow-hidden rounded-3xl"
    >
      <div className="relative h-32 overflow-hidden sm:h-36">
        <ProductImage product={product} className="absolute inset-0" />
        <div className="absolute left-3 top-3 rounded-full bg-black/35 p-1 backdrop-blur-md">
          <MatchRing score={score} size={46} />
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => void toggleWishlist(product)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition",
              saved
                ? "border-rose-400/60 bg-rose-500/90 text-white"
                : "border-white/25 bg-black/35 text-white/90 hover:bg-black/55",
            )}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(product.id)}
            aria-pressed={inCompare}
            aria-label={inCompare ? `Remove ${product.name} from comparison` : `Add ${product.name} to comparison`}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition",
              inCompare
                ? "border-secondary/60 bg-secondary text-secondary-foreground"
                : "border-white/25 bg-black/35 text-white/90 hover:bg-black/55",
            )}
          >
            <GitCompareArrows className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="truncate">{product.brand}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-foreground/90">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold leading-snug">
            <button type="button" onClick={() => onOpen(product.id)} className="text-left hover:text-primary">
              {product.name}
            </button>
          </h3>
          <p className="shrink-0 font-display text-sm font-semibold text-primary">{inr(product.price)}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone={tag === "budget" || tag === "student" ? "success" : tag === "premium" ? "secondary" : "default"}>
              {tag}
            </Badge>
          ))}
          <Badge tone="primary">{product.category}</Badge>
        </div>

        {topReason ? <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{topReason}</p> : null}

        {showWhy ? <WhyPanel reasons={reasons} breakdown={breakdown} /> : null}

        <div className="mt-auto flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpen(product.id)}>
            View details
          </Button>
          <Button size="sm" variant={inCompare ? "secondary" : "subtle"} onClick={() => toggleCompare(product.id)} aria-label="Toggle compare">
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
            {inCompare ? "Added" : "Compare"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-border/60">
      <Skeleton className="h-32 rounded-none sm:h-36" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}
