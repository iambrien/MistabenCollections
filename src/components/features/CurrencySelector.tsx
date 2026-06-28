import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useCurrency, CURRENCIES } from "@/stores/currencyStore";
import { cn } from "@/lib/utils";

interface Props {
  compact?: boolean;
}

export default function CurrencySelector({ compact = false }: Props) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 font-medium rounded-lg border border-border transition-all hover:bg-muted/60",
          compact ? "px-2 py-1.5 text-xs gap-0.5" : "px-3 py-2 text-sm gap-1.5"
        )}
        aria-label="Select currency"
      >
        <span className={cn("font-bold text-brand", compact ? "text-xs" : "text-sm")}>
          {currency.symbol}
        </span>
        {!compact && (
          <span className="text-muted-foreground hidden sm:inline">{currency.code}</span>
        )}
        {compact && (
          <span className="text-muted-foreground">{currency.code}</span>
        )}
        <ChevronDown className={cn("text-muted-foreground transition-transform shrink-0", open && "rotate-180", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1">
            Select Currency
          </p>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c); setOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60",
                currency.code === c.code ? "bg-brand/5" : ""
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn("text-base font-bold w-6 text-center shrink-0", currency.code === c.code ? "text-brand" : "text-muted-foreground")}>
                  {c.symbol}
                </span>
                <div className="min-w-0 text-left">
                  <p className={cn("font-medium truncate", currency.code === c.code ? "text-brand" : "text-foreground")}>
                    {c.code}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                </div>
              </div>
              {currency.code === c.code && <Check className="w-4 h-4 text-brand shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
