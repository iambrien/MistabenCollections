import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Currency {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira", locale: "en-NG" },
  { code: "GHS", symbol: "₵", label: "Ghana Cedis", locale: "en-GH" },
  { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
  { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },
  { code: "EUR", symbol: "€", label: "Euro", locale: "de-DE" },
];

const STORAGE_KEY = "mistaben_currency";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

function getSaved(): Currency {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = CURRENCIES.find((c) => c.code === saved);
      if (found) return found;
    }
  } catch {}
  return CURRENCIES[0]; // default: NGN
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(getSaved);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c.code); } catch {}
  };

  const format = (amount: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
