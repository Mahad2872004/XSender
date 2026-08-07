import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, minorPerMajor } from './money';

describe('formatMoney', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatMoney(75000, 'PKR')).toBe('Rs. 750');
  });

  it('keeps decimals only when there is a fractional part', () => {
    expect(formatMoney(125050, 'PKR')).toBe('Rs. 1,250.50');
    expect(formatMoney(125000, 'PKR')).toBe('Rs. 1,250');
  });

  it('groups thousands', () => {
    expect(formatMoney(5500000000, 'PKR')).toBe('Rs. 55,000,000');
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'PKR')).toBe('Rs. 0');
  });

  it('uses the right symbol per currency', () => {
    expect(formatMoney(1000, 'USD')).toBe('$ 10');
    expect(formatMoney(1000, 'GBP')).toBe('£ 10');
  });

  it('falls back to the code for an unknown currency', () => {
    expect(formatMoney(1000, 'XYZ')).toContain('XYZ');
  });
});

describe('parseMoney', () => {
  it('parses a plain number', () => {
    expect(parseMoney('750', 'PKR')).toBe(75000);
  });

  it('ignores currency symbols and separators', () => {
    expect(parseMoney('Rs. 1,250', 'PKR')).toBe(125000);
  });

  it('parses decimals', () => {
    expect(parseMoney('1250.50', 'PKR')).toBe(125050);
  });

  it('rounds rather than truncating, so a paisa is never lost', () => {
    expect(parseMoney('10.005', 'PKR')).toBe(1001);
  });

  it('rejects empty and negative input', () => {
    expect(parseMoney('', 'PKR')).toBeNull();
    expect(parseMoney('-5', 'PKR')).toBeNull();
    expect(parseMoney('abc', 'PKR')).toBeNull();
  });

  it('round-trips through formatMoney', () => {
    for (const value of ['750', '1250.50', '0', '99999']) {
      const minor = parseMoney(value, 'PKR')!;
      expect(parseMoney(formatMoney(minor, 'PKR'), 'PKR')).toBe(minor);
    }
  });
});

describe('minorPerMajor', () => {
  it('is 100 for ordinary currencies', () => {
    expect(minorPerMajor('PKR')).toBe(100);
  });

  it('is 1 for zero-decimal currencies', () => {
    // Getting this wrong would inflate every yen price a hundredfold.
    expect(minorPerMajor('JPY')).toBe(1);
  });
});
