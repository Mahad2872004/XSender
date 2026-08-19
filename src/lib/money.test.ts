import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, minorPerMajor } from './money';

describe('formatMoney', () => {
  it('formats whole amounts without decimals', () => {
    // "$750.00" on a menu reads as noise next to "$750".
    expect(formatMoney(75000, 'USD', 'en-US')).toBe('$750');
  });

  it('keeps decimals only when there is a fractional part', () => {
    expect(formatMoney(125050, 'USD', 'en-US')).toBe('$1,250.50');
    expect(formatMoney(125000, 'USD', 'en-US')).toBe('$1,250');
  });

  it('uses the locale’s own conventions', () => {
    expect(formatMoney(75000, 'GBP', 'en-GB')).toBe('£750');
    // Indian grouping is lakh-based, which a naive thousands separator gets wrong.
    expect(formatMoney(12500000, 'INR', 'en-IN')).toBe('₹1,25,000');
  });

  it('renders PKR as Rs in a Pakistani locale', () => {
    expect(formatMoney(75000, 'PKR', 'en-PK')).toContain('750');
    expect(formatMoney(75000, 'PKR', 'en-PK')).toMatch(/Rs/);
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'USD', 'en-US')).toBe('$0');
  });

  it('does not invent decimals for zero-decimal currencies', () => {
    // JPY has no minor unit; 750 minor units is ¥750, not ¥7.50.
    expect(formatMoney(750, 'JPY', 'ja-JP')).toContain('750');
    expect(formatMoney(750, 'JPY', 'ja-JP')).not.toContain('.');
  });

  it('falls back rather than throwing on an unknown currency', () => {
    expect(formatMoney(75000, 'XYZ', 'en-US')).toContain('XYZ');
  });
});

describe('minorPerMajor', () => {
  it('is 100 for ordinary currencies', () => {
    expect(minorPerMajor('PKR')).toBe(100);
    expect(minorPerMajor('USD')).toBe(100);
  });

  it('is 1 for zero-decimal currencies', () => {
    // Getting this wrong inflates every yen price a hundredfold.
    expect(minorPerMajor('JPY')).toBe(1);
    expect(minorPerMajor('KRW')).toBe(1);
  });

  it('is 1000 for the three-decimal Gulf currencies', () => {
    // The reason this is asked of Intl rather than a hand-written list: the
    // GCC is a target market and a hardcoded table gets all three wrong.
    expect(minorPerMajor('KWD')).toBe(1000);
    expect(minorPerMajor('BHD')).toBe(1000);
    expect(minorPerMajor('OMR')).toBe(1000);
  });

  it('is case-insensitive', () => {
    expect(minorPerMajor('usd')).toBe(100);
  });
});

describe('parseMoney', () => {
  it('parses a plain number', () => {
    expect(parseMoney('750', 'PKR')).toBe(75000);
  });

  it('ignores currency symbols and separators', () => {
    // The full stop in "Rs." used to survive and make this 0.125.
    expect(parseMoney('Rs. 1,250', 'PKR')).toBe(125000);
    expect(parseMoney('$1,250', 'USD')).toBe(125000);
  });

  it('parses decimals', () => {
    expect(parseMoney('1250.50', 'PKR')).toBe(125050);
  });

  it('rounds rather than truncating, so a paisa is never lost', () => {
    expect(parseMoney('10.005', 'PKR')).toBe(1001);
  });

  it('scales correctly for a three-decimal currency', () => {
    expect(parseMoney('10.500', 'KWD')).toBe(10500);
  });

  it('rejects empty, negative and non-numeric input', () => {
    expect(parseMoney('', 'PKR')).toBeNull();
    expect(parseMoney('-5', 'PKR')).toBeNull();
    expect(parseMoney('abc', 'PKR')).toBeNull();
  });

  it('round-trips through formatMoney', () => {
    for (const currency of ['USD', 'PKR', 'KWD', 'JPY']) {
      for (const minor of [0, 75000, 125050, 999]) {
        const rendered = formatMoney(minor, currency, 'en-US');
        expect(parseMoney(rendered, currency)).toBe(minor);
      }
    }
  });
});
