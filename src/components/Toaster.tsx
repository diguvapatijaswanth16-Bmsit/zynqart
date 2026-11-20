import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: Variant;
}

interface ToastApi {
  push: (toast: { title: string; description?: string; variant?: Variant }) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<Variant, ReactNode> = {
  default: <Info className="h-4 w-4 text-secondary" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />,
  error: <XCircle className="h-4 w-4 text-rose-400" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<ToastApi["push"]>(({ title, description, variant = "default" }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current.slice(-3), { id, title, description, variant }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 text-sm shadow-2xl",
                "glass-strong",
                toast.variant === "error" && "border-rose-500/40",
                toast.variant === "success" && "border-emerald-500/40",
              )}
            >
              <span className="mt-0.5">{ICONS[toast.variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
