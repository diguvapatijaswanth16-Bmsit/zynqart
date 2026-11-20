import { Filter, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES, type Category, type Needs, type Product } from "@shared/types";
import { CATEGORY_LABELS } from "@shared/catalogue";
import { scoreProduct } from "@shared/scoring";
import { needsSummary } from "@shared/scoring";
import { useStore } from "@/lib/store";
import { inr, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, SectionHeading, Select } from "@/components/ui/primitives";
import { RangeSlider } from "@/components/ui/overlay";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";

type SortKey = "match" | "price-asc" | "price-desc" | "rating";

const PRICE_MAX = 210000;

const EMPTY_NEEDS: Needs = { query: "", category: null, budget: null, tags: [], keywords: [], confidence: 0 };

export default function ExplorePage() {
  const { products, productsLoading, productsError, reloadProducts, needs, setNeeds } = useStore();
  const [category, setCategory] = useState<Category | "all">("all");
  const [brands, setBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>("match");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const allBrands = useMemo(() => {
    const scoped = category === "all" ? products : products.filter((p) => p.category === category);
    return Array.from(new Set(scoped.map((p) => p.brand))).sort();
  }, [category, products]);

  const scored = useMemo(() => {
    const effectiveNeeds: Needs = {
      ...(needs ?? EMPTY_NEEDS),
      category: category === "all" ? (needs?.category ?? null) : category,
      budget: maxPrice < PRICE_MAX ? maxPrice : (needs?.budget ?? null),
      keywords: query.trim() ? Array.from(new Set([...query.toLowerCase().split(/\s+/).filter(Boolean), ...(needs?.keywords ?? [])])) : (needs?.keywords ?? []),
    };

    const list = products
      .filter((product) => (category === "all" ? true : product.category === category))
      .filter((product) => (brands.length ? brands.includes(product.brand) : true))
      .filter((product) => product.price <= maxPrice)
      .filter((product) => product.rating >= minRating)
      .filter((product) => {
        if (!query.trim()) return true;
        const haystack = `${product.name} ${product.brand} ${product.tags.join(" ")} ${product.summary} ${Object.values(product.specs).join(" ")}`.toLowerCase();
        return query
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .every((word) => haystack.includes(word));
      })
      .map((product) => scoreProduct(product, effectiveNeeds));

    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => a.product.price - b.product.price);
      case "price-desc":
        return list.sort((a, b) => b.product.price - a.product.price);
      case "rating":
        return list.sort((a, b) => b.product.rating - a.product.rating);
      default:
        return list.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);
    }
  }, [brands, category, maxPrice, minRating, needs, products, query, sort]);

  const activeFilters = (category !== "all" ? 1 : 0) + brands.length + (maxPrice < PRICE_MAX ? 1 : 0) + (minRating > 0 ? 1 : 0);
  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  const reset = () => {
    setCategory("all");
    setBrands([]);
    setMaxPrice(PRICE_MAX);
    setMinRating(0);
    setQuery("");
    setSort("match");
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Catalogue"
        title="Explore with match scores"
        description="Every product is scored 0–100 on category fit, tag fit, budget fit and rating. Sort by best match for your last request, or filter down yourself."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filters {activeFilters ? `(${activeFilters})` : ""}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        }
      />

      {needs ? (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden />
          <span className="text-muted-foreground">Scoring against your assistant request:</span>
          <span className="font-medium">{needsSummary(needs)}</span>
          <button type="button" onClick={() => setNeeds(null)} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="h-3 w-3" aria-hidden /> Clear
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <aside className={cn("space-y-4", filtersOpen ? "block" : "hidden lg:block")} aria-label="Product filters">
          <div className="glass space-y-5 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Filter className="h-3.5 w-3.5 text-primary" aria-hidden /> Filters
              </h2>
              <span className="text-[11px] text-muted-foreground">{scored.length} shown</span>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  aria-pressed={category === "all"}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition",
                    category === "all" ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setBrands([]);
                    }}
                    aria-pressed={category === cat}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition",
                      category === cat ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Price up to</p>
              <RangeSlider
                label="Maximum price"
                min={1000}
                max={PRICE_MAX}
                step={1000}
                value={maxPrice}
                onValueChange={setMaxPrice}
                format={(value) => (value >= PRICE_MAX ? "Any" : inr(value))}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Minimum rating</p>
              <div className="flex gap-1.5">
                {[0, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setMinRating(rating)}
                    aria-pressed={minRating === rating}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition",
                      minRating === rating ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {rating === 0 ? "Any" : `★ ${rating}+`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand</p>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {allBrands.map((brand) => (
                  <label key={brand} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-xs hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={brands.includes(brand)}
                      onChange={() => setBrands((current) => (current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand]))}
                      className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                    />
                    <span className="text-muted-foreground">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search names, specs or tags…"
              aria-label="Search products"
              className="sm:max-w-xs"
            />
            <div className="flex items-center gap-2 sm:ml-auto">
              <label htmlFor="sort" className="text-xs text-muted-foreground">
                Sort
              </label>
              <Select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="w-40">
                <option value="match">Best match</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </Select>
            </div>
          </div>

          {productsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : productsError ? (
            <EmptyState
              icon={<X className="h-5 w-5" />}
              title="Couldn't load the catalogue"
              description={productsError}
              action={<Button onClick={() => void reloadProducts()}>Retry</Button>}
            />
          ) : scored.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No products match those filters"
              description="Try widening the price range, clearing brands, or asking the assistant in plain language."
              action={<Button variant="outline" onClick={reset}>Reset filters</Button>}
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {scored.length} product{scored.length === 1 ? "" : "s"}
                {needs ? " · scores personalised to your request" : " · scores use a neutral profile until you chat"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {scored.map((item, index) => (
                  <ProductCard key={item.product.id} scored={item} onOpen={setOpenProductId} index={index} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
    </div>
  );
}

export type { Product };
