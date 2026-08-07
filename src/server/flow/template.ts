/**
 * {{variable}} interpolation for message bodies.
 *
 * Deliberately not a general expression language: flows are authored by
 * non-technical business owners, and the values come from customer input.
 * Substitution only — nothing here evaluates.
 */

export type FlowVariables = Record<string, unknown>;

const TOKEN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;

/** Read `a.b.c` out of a nested object without throwing on a missing branch. */
function lookup(variables: FlowVariables, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, variables);
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  return JSON.stringify(value);
}

/**
 * Replace every {{token}} with its value. Unknown tokens become empty strings
 * rather than being left as literal braces — showing a customer "{{name}}" is
 * worse than showing nothing.
 */
export function renderTemplate(template: string, variables: FlowVariables): string {
  return template.replace(TOKEN, (_match, path: string) =>
    formatValue(lookup(variables, path))
  );
}

/** Token names a template refers to, for the builder's "unknown variable" warning. */
export function referencedVariables(template: string): string[] {
  return [...template.matchAll(TOKEN)].map((m) => m[1]);
}
