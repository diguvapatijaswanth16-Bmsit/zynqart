import type { Product } from "@shared/types";
import { cn, productArt, productArtKind, type ProductArtKind } from "@/lib/utils";

/**
 * Product imagery: a vector line illustration of the actual product shape on the
 * category's gradient. No stock-photo dependencies, so it renders the same in the
 * Worker preview, offline, and on every device.
 */
function Illustration({ kind }: { kind: ProductArtKind }) {
  const line = {
    stroke: "white",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (kind) {
    case "laptop":
      return (
        <g {...line}>
          <rect x="54" y="24" width="92" height="64" rx="6" fill="rgba(255,255,255,0.12)" strokeOpacity="0.95" />
          <rect x="62" y="32" width="76" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="none" />
          <path d="M40 96h120l-9 13H49z" fill="rgba(255,255,255,0.22)" strokeOpacity="0.9" />
          <path d="M84 101h32" strokeOpacity="0.45" strokeWidth="2.6" />
        </g>
      );
    case "phone":
      return (
        <g {...line}>
          <rect x="79" y="18" width="42" height="94" rx="10" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <rect x="85" y="29" width="30" height="70" rx="5" fill="rgba(255,255,255,0.12)" stroke="none" />
          <rect x="91" y="23" width="18" height="4.5" rx="2.2" fill="rgba(255,255,255,0.6)" stroke="none" />
          <circle cx="112" cy="104" r="3" fill="rgba(255,255,255,0.55)" stroke="none" />
          <path d="M90 45h12" strokeOpacity="0.35" strokeWidth="2.4" />
        </g>
      );
    case "headphones":
      return (
        <g {...line}>
          <path d="M62 84V62a38 38 0 0 1 76 0v22" strokeWidth="4" />
          <rect x="50" y="78" width="20" height="34" rx="9" fill="rgba(255,255,255,0.28)" strokeOpacity="0.95" />
          <rect x="130" y="78" width="20" height="34" rx="9" fill="rgba(255,255,255,0.28)" strokeOpacity="0.95" />
          <path d="M60 88h9M131 88h9" strokeOpacity="0.5" strokeWidth="2.2" />
        </g>
      );
    case "watch":
      return (
        <g {...line}>
          <path d="M86 34V16h28v18M86 92v18h28V92" strokeWidth="7" strokeOpacity="0.5" />
          <rect x="76" y="34" width="48" height="58" rx="13" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <circle cx="100" cy="63" r="15" strokeOpacity="0.45" strokeWidth="2.6" />
          <path d="M100 54v9l7 5" strokeWidth="2.6" strokeOpacity="0.85" />
          <rect x="122" y="54" width="4" height="10" rx="2" fill="rgba(255,255,255,0.6)" stroke="none" />
        </g>
      );
    case "camera":
      return (
        <g {...line}>
          <path d="M76 44l7-11h30l7 11" fill="rgba(255,255,255,0.14)" />
          <rect x="52" y="44" width="96" height="58" rx="10" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <circle cx="100" cy="72" r="20" fill="rgba(255,255,255,0.1)" />
          <circle cx="100" cy="72" r="10" fill="rgba(255,255,255,0.3)" stroke="none" />
          <circle cx="132" cy="55" r="3.2" fill="rgba(255,255,255,0.6)" stroke="none" />
        </g>
      );
    case "tv":
      return (
        <g {...line}>
          <rect x="36" y="28" width="128" height="74" rx="6" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <rect x="44" y="36" width="112" height="58" rx="3" fill="rgba(255,255,255,0.1)" stroke="none" />
          <path d="M100 102v12M78 118h44" strokeWidth="3.4" />
        </g>
      );
    case "fridge":
      return (
        <g {...line}>
          <rect x="74" y="14" width="52" height="102" rx="8" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <path d="M74 54h52" strokeWidth="2.8" strokeOpacity="0.8" />
          <path d="M116 30v14M116 62v16" strokeWidth="3" strokeOpacity="0.7" />
        </g>
      );
    case "washer":
      return (
        <g {...line}>
          <rect x="58" y="24" width="84" height="92" rx="9" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <rect x="68" y="34" width="64" height="12" rx="4" strokeOpacity="0.45" strokeWidth="2.4" />
          <circle cx="100" cy="82" r="24" fill="rgba(255,255,255,0.1)" />
          <circle cx="100" cy="82" r="13" fill="rgba(255,255,255,0.18)" strokeOpacity="0.4" />
        </g>
      );
    case "ac":
      return (
        <g {...line}>
          <rect x="34" y="40" width="132" height="34" rx="10" fill="rgba(255,255,255,0.16)" strokeOpacity="0.95" />
          <path d="M46 64h108" strokeOpacity="0.45" strokeWidth="2.6" />
          <path d="M60 82c0 8 6 10 6 18M100 82c0 8 6 10 6 18M140 82c0 8-6 10-6 18" strokeOpacity="0.4" strokeWidth="2.8" />
        </g>
      );
    case "vacuum":
      return (
        <g {...line}>
          <path d="M116 18l-16 58" strokeWidth="4" />
          <path d="M116 18h16" strokeWidth="4" />
          <circle cx="98" cy="84" r="10" fill="rgba(255,255,255,0.26)" strokeOpacity="0.95" />
          <path d="M88 98h22l12 16H76z" fill="rgba(255,255,255,0.2)" strokeOpacity="0.95" />
        </g>
      );
    case "appliance":
      return (
        <g {...line}>
          <rect x="56" y="30" width="88" height="74" rx="9" fill="rgba(255,255,255,0.14)" strokeOpacity="0.95" />
          <rect x="68" y="42" width="64" height="34" rx="4" fill="rgba(255,255,255,0.1)" strokeOpacity="0.4" strokeWidth="2.4" />
          <circle cx="76" cy="90" r="3" fill="rgba(255,255,255,0.6)" stroke="none" />
          <circle cx="88" cy="90" r="3" fill="rgba(255,255,255,0.6)" stroke="none" />
          <path d="M104 90h28" strokeOpacity="0.35" strokeWidth="2.4" />
        </g>
      );
    case "pants":
      return (
        <g {...line}>
          <path
            d="M74 20h52l4 34-6 52h-18l-4-46h-4l-4 46H76l-6-52z"
            fill="rgba(255,255,255,0.16)"
            strokeOpacity="0.95"
          />
          <path d="M76 32h48" strokeOpacity="0.5" strokeWidth="2.6" />
          <path d="M100 56v20" strokeOpacity="0.3" strokeWidth="2.2" />
        </g>
      );
    case "dress":
      return (
        <g {...line}>
          <path
            d="M84 20h32l-4 14 10 12-8 12 18 48H68l18-48-8-12 10-12z"
            fill="rgba(255,255,255,0.16)"
            strokeOpacity="0.95"
          />
          <path d="M92 20c0 5 3 8 8 8s8-3 8-8" strokeOpacity="0.45" strokeWidth="2.4" />
          <path d="M86 62h28" strokeOpacity="0.35" strokeWidth="2.4" />
        </g>
      );
    case "tee":
    default:
      return (
        <g {...line}>
          <path
            d="M78 34l10-8h24l10 8 16 12-10 16-8-6v50H80V56l-8 6-10-16z"
            fill="rgba(255,255,255,0.16)"
            strokeOpacity="0.95"
          />
          <path d="M88 26c0 6 5 10 12 10s12-4 12-10" strokeOpacity="0.45" strokeWidth="2.4" />
        </g>
      );
  }
}

export function ProductImage({
  product,
  className,
  showBrand = true,
}: {
  product: Product;
  className?: string;
  showBrand?: boolean;
}) {
  const art = productArt(product);
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: art.gradient }} aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 72% 16%, rgba(255,255,255,.45), transparent 60%)" }}
      />
      <svg viewBox="0 0 200 130" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <Illustration kind={productArtKind(product)} />
      </svg>
      {showBrand ? (
        <span className="absolute bottom-1.5 left-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 drop-shadow">
          {product.brand}
        </span>
      ) : null}
    </div>
  );
}
