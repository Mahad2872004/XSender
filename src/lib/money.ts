/**
 * Money.
 *
 * Stored and computed in integer minor units — paisa, cents, fils. Floating
 * point is never used: 0.1 + 0.2 !== 0.3, and an order total a paisa out is a
 * support ticket.
 *
 * How many minor units make a major one is asked of `Intl` rather than kept in
 * a hand-written table. Most currencies use 100, JPY and KRW use 1, and the
 * Gulf currencies (KWD, BHD, OMR) use 1000 — a hardcoded list gets the last
 * group wrong, which is expensive in exactly the markets worth selling to.
 */

/**
 * ISO 4217 minor-unit exponents that are not the usual 2.
 *
 * Deliberately *not* read from `Intl`. CLDR reports what a locale conventionally
 * *displays* — it says PKR has 0 decimals because paisa are effectively out of
 * use — whereas storage has to follow ISO 4217, which says 2. Taking the display
 * convention as the storage exponent would silently divide every rupee amount in
 * the database by a hundred.
 *
 * This is the same list payment processors use, which also makes Phase 6's
 * Stripe amounts line up without conversion.
 */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** Decimal places this currency stores, per ISO 4217. */
function currencyDecimals(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

export function minorPerMajor(currency: string): number {
  return 10 ** currencyDecimals(currency);
}

/**
 * Format for display. Trailing zero decimals are dropped, because "$750.00"
 * reads as noise next to "$750" on a menu.
 */
export function formatMoney(minor: number, currency = 'PKR', locale = 'en-US'): string {
  const code = currency.toUpperCase();
  const divisor = minorPerMajor(code);
  const major = minor / divisor;
  const hasFraction = divisor > 1 && minor % divisor !== 0;
  const digits = hasFraction ? currencyDecimals(code) : 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major);
  } catch {
    // An unrecognised currency code should still render something sensible.
    return `${code} ${major.toFixed(digits)}`;
  }
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
