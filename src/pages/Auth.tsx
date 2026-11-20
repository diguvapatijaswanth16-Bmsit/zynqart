import { Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassCard, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/Toaster";

const ERROR_COPY: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured on this deployment.",
  invalid_state: "The Google sign-in attempt expired. Please try again.",
  token_exchange_failed: "Google could not confirm the sign-in. Try again.",
  profile_failed: "We could not read your Google profile.",
  no_email: "Your Google account did not share an email address.",
  oauth_failed: "Google sign-in failed. Try again.",
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser, googleEnabled, user } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get("error");
    if (code) setError(ERROR_COPY[code] ?? "Sign-in failed. Please try again.");
  }, [params]);

  useEffect(() => {
    if (user) navigate("/assistant", { replace: true });
  }, [navigate, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") await api.register(email, password, name);
      else await api.login(email, password);
      await refreshUser();
      push({ title: mode === "signup" ? "Account created" : "Welcome back", description: "Your wishlist now syncs across devices.", variant: "success" });
      navigate("/assistant");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 py-6 md:grid-cols-[1fr_22rem] md:items-center">
      <div className="hidden md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/90">Zynqart account</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">
          Your needs, <span className="text-gradient">remembered</span>.
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Sign in to sync your wishlist, keep chat history and receive price-drop alerts on every device. Browsing, the assistant and
          comparisons work perfectly without an account.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden /> Passwords are hashed with PBKDF2-SHA256 (100k iterations).
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden /> Wishlist rows are scoped to your user id server-side.
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden /> Guest wishlists merge automatically on sign-in.
          </li>
        </ul>
      </div>

      <GlassCard className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1" role="tablist" aria-label="Authentication mode">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => {
                setMode(tab);
                setError(null);
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                mode === tab ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <div>
              <label htmlFor="name" className="mb-1 block text-xs text-muted-foreground">
                Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ananya" autoComplete="name" className="pl-9" required />
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-muted-foreground">
              Password {mode === "signup" ? "(min 8 characters)" : ""}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="pl-9"
                required
                minLength={8}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border/70" /> or <span className="h-px flex-1 bg-border/70" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          disabled={!googleEnabled}
          title={googleEnabled ? "Continue with Google" : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in"}
          onClick={() => {
            window.location.href = "/api/auth/google/start";
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1A6.2 6.2 0 1 1 16.1 7l2.7-2.6A9.9 9.9 0 1 0 12 21.9c5.7 0 9.5-4 9.5-9.6 0-.7-.1-1.2-.2-1.8H12z" />
          </svg>
          Continue with Google
        </Button>
        {!googleEnabled ? (
          <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
            Google sign-in appears here once the OAuth client id and secret are configured on the server.
          </p>
        ) : null}
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Browsing, chat and comparison never require an account.
        </p>
      </GlassCard>
    </div>
  );
}
