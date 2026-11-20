import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "right" | "center";
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, side = "right", className }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[#03040d]/75 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={description ? undefined : undefined}>
              <motion.div
                initial={side === "right" ? { x: 48, opacity: 0 } : { scale: 0.96, opacity: 0 }}
                animate={side === "right" ? { x: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
                exit={side === "right" ? { x: 48, opacity: 0 } : { scale: 0.97, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className={cn(
                  "glass-strong fixed z-[101] flex flex-col overflow-hidden focus:outline-none",
                  side === "right"
                    ? "inset-y-0 right-0 w-full max-w-xl rounded-l-3xl border-l border-border/80 sm:max-w-2xl"
                    : "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border",
                  className,
                )}
              >
                <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
                  <div>
                    <DialogPrimitive.Title className="font-display text-lg font-semibold leading-tight">{title}</DialogPrimitive.Title>
                    {description ? (
                      <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">{description}</DialogPrimitive.Description>
                    ) : null}
                  </div>
                  <DialogPrimitive.Close
                    aria-label="Close"
                    className="rounded-full border border-border/70 p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </DialogPrimitive.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span id={`${label}-label`}>{label}</span>
        <span className="font-medium text-foreground">{format ? format(value) : value}</span>
      </div>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onValueChange(next[0])}
        aria-label={label}
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/12">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-secondary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </SliderPrimitive.Root>
    </div>
  );
}
