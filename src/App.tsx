import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PageShell } from "./components/Shell";
import AssistantPage from "./pages/Assistant";
import ExplorePage from "./pages/Explore";
import ComparePage from "./pages/Compare";
import BudgetPage from "./pages/Budget";
import WishlistPage from "./pages/Wishlist";
import AuthPage from "./pages/Auth";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <PageShell>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/assistant" replace />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="*"
          element={
            <div className="mx-auto max-w-md py-20 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">404</p>
              <h1 className="mt-2 font-display text-3xl font-semibold">That page isn't in the catalogue</h1>
              <p className="mt-2 text-sm text-muted-foreground">The assistant can still help you find the right product.</p>
            </div>
          }
        />
      </Routes>
    </PageShell>
  );
}
