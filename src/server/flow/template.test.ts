import { describe, expect, it } from 'vitest';
import { referencedVariables, renderTemplate } from './template';

describe('renderTemplate', () => {
  it('substitutes a simple token', () => {
    expect(renderTemplate('Hi {{name}}', { name: 'Sarah' })).toBe('Hi Sarah');
  });

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplate('Hi {{  name  }}', { name: 'Sarah' })).toBe('Hi Sarah');
  });

  it('reads nested paths', () => {
    expect(
      renderTemplate('{{order.item}} costs {{order.price}}', {
        order: { item: 'Beef Biryani', price: 750 },
      })
    ).toBe('Beef Biryani costs 750');
  });

  it('renders an unknown token as empty rather than leaving braces visible', () => {
    // Showing a customer a literal "{{name}}" is worse than showing nothing.
    expect(renderTemplate('Hi {{missing}}!', {})).toBe('Hi !');
  });

  it('does not throw when a path runs through a missing branch', () => {
    expect(renderTemplate('{{a.b.c}}', { a: null })).toBe('');
  });

  it('joins array values', () => {
    expect(renderTemplate('{{items}}', { items: ['a', 'b'] })).toBe('a, b');
  });

  it('leaves text without tokens untouched', () => {
    expect(renderTemplate('No tokens here', { name: 'x' })).toBe('No tokens here');
  });

  it('lists referenced variables', () => {
    expect(referencedVariables('{{a}} and {{b.c}}')).toEqual(['a', 'b.c']);
  });
});
