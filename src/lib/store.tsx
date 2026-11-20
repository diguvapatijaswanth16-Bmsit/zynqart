import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Needs, PriceAlert, Product, SessionUser } from "@shared/types";
import type { LangCode } from "@shared/i18n";
import { api } from "./api";
import { useToast } from "@/components/Toaster";

const LS = {
  wishlist: "zyn.wishlist",
  alerts: "zyn.alerts",
  compare: "zyn.compare",
  language: "zyn.language",
  theme: "zyn.theme",
  needs: "zyn.needs",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — non fatal */
  }
}

interface AppStore {
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  reloadProducts: () => Promise<void>;

  user: SessionUser | null;
  authReady: boolean;
  aiEnabled: boolean;
  googleEnabled: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;

  wishlist: string[];
  toggleWishlist: (product: Product) => Promise<void>;
  isSaved: (id: string) => boolean;

  compare: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  alerts: PriceAlert[];
  addAlert: (product: Product, targetPrice: number) => Promise<void>;
  removeAlert: (productId: string) => Promise<void>;

  language: LangCode;
  setLanguage: (lang: LangCode) => void;

  theme: "dark" | "light";
  toggleTheme: () => void;

  needs: Needs | null;
  setNeeds: (needs: Needs | null) => void;
}

const StoreContext = createContext<AppStore | null>(null);

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside AppProvider");
  return store;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => read<string[]>(LS.wishlist, []));
  const [compare, setCompare] = useState<string[]>(() => read<string[]>(LS.compare, []));
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => read<PriceAlert[]>(LS.alerts, []));
  const [language, setLanguageState] = useState<LangCode>(() => read<LangCode>(LS.language, "en"));
  const [theme, setTheme] = useState<"dark" | "light">(() => read<"dark" | "light">(LS.theme, "dark"));
  const [needs, setNeedsState] = useState<Needs | null>(() => read<Needs | null>(LS.needs, null));

  const reloadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const { products: list } = await api.products();
      setProducts(list);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Could not load products");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProducts();
    void api.providers().then((p) => {
      setAiEnabled(p.ai);
      setGoogleEnabled(p.google);
    }).catch(() => undefined);
  }, [reloadProducts]);

  const mergeLocalWishlist = useCallback(async (nextUser: SessionUser, localIds: string[]) => {
    try {
      const merged = await api.mergeWishlist(localIds);
      const ids = merged.items.map((i) => i.productId);
      setWishlist(ids);
      write(LS.wishlist, ids);
      if (localIds.length) push({ title: "Wishlist synced", description: "Your saved items are now on every device.", variant: "success" });
      return nextUser;
    } catch {
      return nextUser;
    }
  }, [push]);

  const refreshUser = useCallback(async () => {
    try {
      const { user: next } = await api.me();
      setUser(next);
      if (next) {
        const remote = await api.wishlist();
        const localIds = read<string[]>(LS.wishlist, []);
        if (localIds.length) {
          await mergeLocalWishlist(next, localIds);
        } else {
          const ids = remote.items.map((i) => i.productId);
          setWishlist(ids);
          write(LS.wishlist, ids);
        }
        const serverAlerts = await api.alerts();
        const mergedAlerts = [...serverAlerts.alerts, ...read<PriceAlert[]>(LS.alerts, []).filter((a) => !serverAlerts.alerts.some((s) => s.productId === a.productId))];
        setAlerts(mergedAlerts);
        write(LS.alerts, mergedAlerts);
      }
    } catch {
      /* offline — guests keep using localStorage */
    } finally {
      setAuthReady(true);
    }
  }, [mergeLocalWishlist]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    write(LS.theme, theme);
  }, [theme]);

  useEffect(() => write(LS.wishlist, wishlist), [wishlist]);
  useEffect(() => write(LS.compare, compare), [compare]);
  useEffect(() => write(LS.alerts, alerts), [alerts]);
  useEffect(() => write(LS.language, language), [language]);
  useEffect(() => write(LS.needs, needs), [needs]);

  const toggleWishlist = useCallback<AppStore["toggleWishlist"]>(
    async (product) => {
      const saved = wishlist.includes(product.id);
      // optimistic update
      setWishlist((current) => (saved ? current.filter((id) => id !== product.id) : [product.id, ...current]));
      push({
        title: saved ? `Removed from wishlist` : `Saved ${product.name}`,
        description: saved ? undefined : user ? "Synced to your account." : "Saved on this device — sign in to sync.",
        variant: saved ? "default" : "success",
      });
      try {
        if (user) {
          await (saved ? api.removeWish(product.id) : api.addWish(product.id));
        }
      } catch (error) {
        setWishlist((current) => (saved ? [product.id, ...current] : current.filter((id) => id !== product.id)));
        push({ title: "Could not update wishlist", description: error instanceof Error ? error.message : "Try again", variant: "error" });
      }
    },
    [push, user, wishlist],
  );

  const toggleCompare = useCallback<AppStore["toggleCompare"]>(
    (id) => {
      setCompare((current) => {
        if (current.includes(id)) return current.filter((x) => x !== id);
        if (current.length >= 4) {
          push({ title: "Compare holds 4 products", description: "Remove one to add another.", variant: "error" });
          return current;
        }
        return [...current, id];
      });
    },
    [push],
  );

  const addAlert = useCallback<AppStore["addAlert"]>(
    async (product, targetPrice) => {
      const target = Math.max(1, Math.round(targetPrice));
      setAlerts((current) => [
        { productId: product.id, targetPrice: target, createdAt: Date.now() },
        ...current.filter((a) => a.productId !== product.id),
      ]);
      try {
        await api.addAlert(product.id, target);
        push({
          title: "Price alert set",
          description: `We'll flag ${product.name} at or below ₹${target.toLocaleString("en-IN")}.`,
          variant: "success",
        });
      } catch (error) {
        push({ title: "Saved on this device only", description: error instanceof Error ? error.message : undefined, variant: "error" });
      }
    },
    [push],
  );

  const removeAlert = useCallback<AppStore["removeAlert"]>(
    async (productId) => {
      setAlerts((current) => current.filter((a) => a.productId !== productId));
      try {
        await api.removeAlert(productId);
      } catch {
        /* local removal is enough for guests */
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    push({ title: "Signed out", description: "Your wishlist stayed on this device." });
  }, [push]);

  const setLanguage = useCallback((next: LangCode) => {
    setLanguageState(next);
  }, []);

  const clearCompare = useCallback(() => setCompare([]), []);

  const value = useMemo<AppStore>(
    () => ({
      products,
      productsLoading,
      productsError,
      reloadProducts,
      user,
      authReady,
      aiEnabled,
      googleEnabled,
      signOut,
      refreshUser,
      wishlist,
      toggleWishlist,
      isSaved: (id: string) => wishlist.includes(id),
      compare,
      toggleCompare,
      clearCompare,
      alerts,
      addAlert,
      removeAlert,
      language,
      setLanguage,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      needs,
      setNeeds: setNeedsState,
    }),
    [
      addAlert, aiEnabled, alerts, authReady, clearCompare, compare, googleEnabled, language, needs, products,
      productsError, productsLoading, refreshUser, reloadProducts, removeAlert, setLanguage, signOut, theme,
      toggleCompare, toggleWishlist, user, wishlist,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
