import { AnimatePresence, motion } from "framer-motion";
import { GitCompareArrows, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import { TopNav } from "./TopNav";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/50 bg-background/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-base font-semibold">
            Zynq<span className="text-primary">art</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Find the right product, not just any product.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/assistant" className="hover:text-foreground">Assistant</Link>
          <Link to="/explore" className="hover:text-foreground">Explore</Link>
          <Link to="/compare" className="hover:text-foreground">Compare</Link>
          <Link to="/budget" className="hover:text-foreground">Budget</Link>
          <Link to="/wishlist" className="hover:text-foreground">Wishlist</Link>
        </nav>
        <p className="text-xs text-muted-foreground">Built for ETC project: AI in E-Commerce</p>
      </div>
    </footer>
  );
}

export function CompareTray() {
  const { compare, products, clearCompare } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const selected = compare.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const visible = selected.length > 0 && location.pathname !== "/compare";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-[90] sm:inset-x-auto sm:left-1/2 sm:w-[min(46rem,calc(100%-1.5rem))] sm:-translate-x-1/2"
        >
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-2xl">
            <div className="hidden shrink-0 items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary sm:flex">
              <GitCompareArrows className="h-3.5 w-3.5" aria-hidden /> {selected.length}/4
            </div>
            <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto no-scrollbar">
              {selected.map((product) => (
                <li key={product!.id} className="max-w-[9.5rem] shrink-0 truncate rounded-lg bg-white/5 px-2 py-1 text-[11px]">
                  {product!.name}
                </li>
              ))}
            </ul>
            <Button size="sm" onClick={() => navigate("/compare")}>
              Compare
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Clear comparison" onClick={clearCompare}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="cinema-bg" aria-hidden />
      <TopNav />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        {children}
      </main>
      <Footer />
      <CompareTray />
    </div>
  );
}
