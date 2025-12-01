/**
 * Currency utilities for Primal
 * Adapted from Jumble Spark wallet
 */

// Define interface for currency symbol properties
interface CurrencySymbolProps {
  symbol: string // The actual symbol or text to display
  isSymbol: boolean // Whether it's a standalone symbol (true) or text/letters (false)
}

// Map of currency codes to their symbol properties
export const currencySymbols: Record<string, CurrencySymbolProps> = {
  // Single-character symbols
  USD: { symbol: '$', isSymbol: true },
  EUR: { symbol: '€', isSymbol: true },
  GBP: { symbol: '£', isSymbol: true },
  JPY: { symbol: '¥', isSymbol: true },
  CNY: { symbol: '¥', isSymbol: true },
  KRW: { symbol: '₩', isSymbol: true },
  INR: { symbol: '₹', isSymbol: true },
  TRY: { symbol: '₺', isSymbol: true },
  PHP: { symbol: '₱', isSymbol: true },
  ILS: { symbol: '₪', isSymbol: true },
  VND: { symbol: '₫', isSymbol: true },

  // Dollar-based symbols
  AUD: { symbol: '$', isSymbol: true },
  CAD: { symbol: '$', isSymbol: true },
  SGD: { symbol: '$', isSymbol: true },
  NZD: { symbol: '$', isSymbol: true },
  HKD: { symbol: '$', isSymbol: true },
  MXN: { symbol: '$', isSymbol: true },
  TWD: { symbol: '$', isSymbol: true },
  CLP: { symbol: '$', isSymbol: true },

  // Special case with prefix letter
  BRL: { symbol: 'R$', isSymbol: true },

  // Text-based representations
  CHF: { symbol: 'FR', isSymbol: false },
  ZAR: { symbol: 'R', isSymbol: false },
  PLN: { symbol: 'ZŁ', isSymbol: false },
  RUB: { symbol: '₽', isSymbol: false },
  THB: { symbol: '฿', isSymbol: false },
  NOK: { symbol: 'KR', isSymbol: false },
  SEK: { symbol: 'KR', isSymbol: false },
  DKK: { symbol: 'KR', isSymbol: false },
  IDR: { symbol: 'RP', isSymbol: false },
  AED: { symbol: 'AED', isSymbol: false },
  SAR: { symbol: 'SAR', isSymbol: false },
  CZK: { symbol: 'KČ', isSymbol: false },
  MYR: { symbol: 'RM', isSymbol: false },
  SATS: { symbol: 'sats', isSymbol: false }
}

// Popular currencies to show at top of selection
export const popularCurrencies = ['SATS', 'USD', 'EUR', 'GBP', 'JPY']

// Default to currency code if no symbol is available
export const getCurrencySymbol = (currencyCode: string): CurrencySymbolProps => {
  return currencySymbols[currencyCode] || { symbol: currencyCode, isSymbol: false }
}

/**
 * Format satoshis amount with currency conversion
 */
export const formatBalanceWithCurrency = (sats: number, currency: string): string => {
  if (currency === 'SATS') {
    return sats.toLocaleString()
  }

  // For fiat currencies, return the sats value (conversion will be done async)
  return sats.toLocaleString()
}

/**
 * Format fiat amount with proper currency symbol
 */
export const formatFiatAmount = (amount: number, currency: string): string => {
  const symbolProps = getCurrencySymbol(currency)

  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)

  // Special case for BRL (Brazilian Real)
  if (currency === 'BRL') {
    return `${symbolProps.symbol}${formattedNumber}`
  }

  // For dollar-based currencies that aren't USD, include the currency code
  if (symbolProps.symbol === '$' && currency !== 'USD') {
    return `${symbolProps.symbol}${formattedNumber} ${currency}`
  }

  return `${symbolProps.symbol}${formattedNumber}`
}
