import { useCurrency } from "@/stores/currencyStore";

/**
 * Returns a format() function that converts an NGN price
 * to the currently selected currency and formats it.
 */
export function useCurrencyFormat() {
  const { format, convert, currency } = useCurrency();
  return { format, convert, currency };
}
