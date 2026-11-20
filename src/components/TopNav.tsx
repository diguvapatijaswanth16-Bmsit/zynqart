import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  Compass,
  GitCompareArrows,
  Heart,
  Languages,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LANGUAGES, type LangCode } from "@shared/i18n";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";

const LINKS = [
  { to: "/assistant", label: "Assistant", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
];

export function TopNav() {
  const { user, signOut, theme, toggleTheme, language, setLanguage, wishlist, compare } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const counts: Record<string, number> = { "/compare": compare.length, "/wishlist": wishlist.length };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/assistant" className="group inline-flex items-center gap-2.5" aria-label="Zynqart home">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary via-secondary to-[#6d28d9] text-base font-bold text-white shadow-lg shadow-primary/25">
            Z
            <span aria-hidden className="absolute -inset-0.5 -z-10 rounded-xl bg-primary/40 blur-md opacity-60 transition group-hover:opacity-100" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Zynq<span className="text-primary">art</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  {counts[to] ? (
                    <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">{counts[to]}</span>
                  ) : null}
                  {isActive ? (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-white/[0.07]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <label className="sr-only" htmlFor="lang-select">
            Assistant language
          </label>
          <div className="relative hidden items-center sm:flex">
            <Languages className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <select
              id="lang-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as LangCode)}
              className="h-9 appearance-none rounded-full border border-border/70 bg-white/5 pl-7 pr-6 text-xs text-foreground transition hover:border-primary/40 focus-visible:outline-none"
              aria-label="Assistant language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-background text-foreground">
                  {l.native}
                </option>
              ))}
            </select>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          </Button>

          {user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Profile menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-gradient-to-br from-primary/30 to-secondary/40 text-sm font-semibold uppercase text-foreground transition hover:border-primary/60"
                >
                  {user.name.slice(0, 1)}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="glass-strong z-[110] w-56 rounded-2xl p-1.5 text-sm shadow-2xl"
                >
                  <div className="px-3 py-2">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border/70" />
                  <DropdownMenu.Item
                    onSelect={() => navigate("/wishlist")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-white/10"
                  >
                    <Heart className="h-3.5 w-3.5" aria-hidden /> Wishlist & alerts
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void signOut()}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-rose-300 outline-none data-[highlighted]:bg-rose-500/15"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
              <User className="h-3.5 w-3.5" aria-hidden /> Sign in
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 bg-background/95 lg:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3">
              {LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                      isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-white/5",
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden /> {label}
                  </span>
                  {counts[to] ? <span className="text-xs">{counts[to]}</span> : null}
                </NavLink>
              ))}
              <div className="mt-1 flex items-center gap-2 border-t border-border/60 pt-2">
                <label htmlFor="lang-select-mobile" className="sr-only">
                  Assistant language
                </label>
                <select
                  id="lang-select-mobile"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LangCode)}
                  className="h-9 flex-1 rounded-xl border border-border/70 bg-white/5 px-3 text-xs"
                  aria-label="Assistant language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-background text-foreground">
                      {l.native}
                    </option>
                  ))}
                </select>
                {!user ? (
                  <Button size="sm" onClick={() => { setMobileOpen(false); navigate("/auth"); }}>
                    Sign in
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
