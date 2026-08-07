/**
 * Money.
 *
 * Everything is stored and computed in integer minor units — paisa, cents.
 * Floating point is never used for money: 0.1 + 0.2 !== 0.3, and an order total
 * that is a paisa off is a support ticket.
 */

const SYMBOLS: Record<string, string> = {
  PKR: 'Rs.',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  INR: '₹',
};

/** Currencies whose minor unit is the same as the major unit. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND']);

export function minorPerMajor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

/** "Rs. 750" or "Rs. 1,250.50" — trailing .00 is dropped, it reads as noise. */
export function formatMoney(minor: number, currency = 'PKR'): string {
  const divisor = minorPerMajor(currency);
  const major = minor / divisor;
  const hasFraction = divisor > 1 && minor % divisor !== 0;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(major);

  return `${currencySymbol(currency)} ${formatted}`.replace(/\s+/, ' ');
}

/**
 * Parse user input ("750", "Rs. 750", "1,250.50") into minor units.
 *
 * Matches the first number rather than stripping non-numeric characters: the
 * full stop in "Rs." would otherwise survive and turn "Rs. 1,250" into 0.125.
 */
export function parseMoney(input: string, currency = 'PKR'): number | null {
  const withoutSeparators = input.replace(/,/g, '');
  const match = withoutSeparators.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const major = Number(match[0]);
  if (!Number.isFinite(major) || major < 0) return null;

  return Math.round(major * minorPerMajor(currency));
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
