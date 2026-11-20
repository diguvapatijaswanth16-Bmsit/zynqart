import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ScoreBreakdown } from "@shared/types";
import { cn } from "@/lib/utils";
import { copyFor } from "@shared/i18n";
import { useStore } from "@/lib/store";

const BAR_LABELS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "needs", label: "Needs fit" },
  { key: "tagFit", label: "Use-case fit" },
  { key: "budget", label: "Budget fit" },
  { key: "rating", label: "Rating" },
];

export function WhyPanel({
  reasons,
  breakdown,
  defaultOpen = false,
  className,
}: {
  reasons: string[];
  breakdown: ScoreBreakdown;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { language } = useStore();
  const copy = copyFor(language);

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-white/[0.03]", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-medium transition hover:bg-white/5"
      >
        <span className="inline-flex items-center gap-1.5 text-secondary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {copy.why}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-3 pb-3">
              <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                {reasons.map((reason, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-1.5">
                {BAR_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(4, breakdown[key])}%` }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                        className={cn(
                          "h-full rounded-full",
                          key === "budget"
                            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                            : key === "rating"
                              ? "bg-gradient-to-r from-amber-400 to-orange-400"
                              : "bg-gradient-to-r from-secondary to-primary",
                        )}
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{breakdown[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
