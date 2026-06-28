import { useCurrency } from "@/stores/currencyStore";

/**
 * Returns a currency-aware format function.
 * Use this in components that display prices to customers.
 * Admin panels use formatPrice() from utils (NGN default) or this hook.
 */
export function useCurrencyFormat() {
  const { format, currency } = useCurrency();
  return { format, currency };
}
