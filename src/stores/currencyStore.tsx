import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Currency {
  code: string;
  symbol: string;
  label: string;
  locale: string;
  rateFromNGN: number; // How many units of this currency = 1 NGN
}

// 2026 mid-market rates (NGN as base, prices stored in NGN)
// 1 NGN = X foreign currency
export const CURRENCIES: Currency[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira",  locale: "en-NG", rateFromNGN: 1 },
  { code: "GHS", symbol: "₵", label: "Ghana Cedis",     locale: "en-GH", rateFromNGN: 0.0068 },  // 1 NGN ≈ 0.0068 GHS  (1 GHS ≈ 147 NGN)
  { code: "USD", symbol: "$", label: "US Dollar",        locale: "en-US", rateFromNGN: 0.00063 }, // 1 NGN ≈ $0.00063   (1 USD ≈ 1,590 NGN)
  { code: "GBP", symbol: "£", label: "British Pound",    locale: "en-GB", rateFromNGN: 0.00049 }, // 1 NGN ≈ £0.00049   (1 GBP ≈ 2,040 NGN)
  { code: "EUR", symbol: "€", label: "Euro",             locale: "de-DE", rateFromNGN: 0.00057 }, // 1 NGN ≈ €0.00057   (1 EUR ≈ 1,754 NGN)
];

const STORAGE_KEY = "mistaben_currency";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Convert an NGN amount to the selected currency and format it */
  format: (amountNGN: number) => string;
  /** Convert NGN amount to selected currency value (unformatted) */
  convert: (amountNGN: number) => number;
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

  const convert = (amountNGN: number): number => {
    return amountNGN * currency.rateFromNGN;
  };

  const format = (amountNGN: number): string => {
    const converted = convert(amountNGN);
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${currency.symbol}${converted.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
