import { getFiatValue } from '@getalby/lightning-tools';
import { createSignal, createEffect, on } from 'solid-js';

/**
 * Hook to convert satoshis to fiat currency
 * Uses @getalby/lightning-tools for conversion rates
 *
 * SolidJS version adapted from Jumble's React hook
 */
export function useCurrencyConversion(sats: () => number, currency: () => string) {
  const [fiatValue, setFiatValue] = createSignal<number | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(on(
    [sats, currency],
    ([currentSats, currentCurrency]) => {
      if (currentCurrency === 'SATS') {
        setFiatValue(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      getFiatValue({ satoshi: currentSats, currency: currentCurrency })
        .then((value: number) => {
          setFiatValue(value);
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setError(err);
          setIsLoading(false);
        });
    }
  ));

  return { fiatValue, isLoading, error };
}
