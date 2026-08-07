import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A 'use server' module may only export async functions.
 *
 * Exporting a constant from one is accepted by `next build` but throws at
 * runtime the moment the module is evaluated — so it slips through CI and
 * surfaces as a broken page. This test is the gate that build isn't.
 *
 * The fix when it fails: move the value into a sibling module (the convention
 * here is `form-state.ts`) and import it from both sides.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function useServerFiles(): string[] {
  return walk(SRC).filter((file) => {
    const head = readFileSync(file, 'utf8').slice(0, 200);
    return /^\s*['"]use server['"]/.test(head);
  });
}

/** Exported bindings that are not `async function` declarations. */
function offendingExports(source: string): string[] {
  const offenders: string[] = [];

  // Strip `export type ...` and `export interface ...` — types are erased.
  const lines = source.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('export ')) continue;
    if (/^export\s+(type|interface)\b/.test(trimmed)) continue;
    if (/^export\s+async\s+function\b/.test(trimmed)) continue;
    if (/^export\s*\{/.test(trimmed)) {
      // Re-exports are only safe when every name is a type.
      if (!/^export\s+type\s*\{/.test(trimmed)) offenders.push(trimmed);
      continue;
    }
    offenders.push(trimmed);
  }

  return offenders;
}

describe("'use server' modules", () => {
  const files = useServerFiles();

  it('finds the server action modules', () => {
    // Guards against the walk silently matching nothing and the suite passing
    // for the wrong reason.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [f.replace(SRC, 'src'), f] as const))(
    '%s exports only async functions',
    (_label, file) => {
      expect(offendingExports(readFileSync(file, 'utf8'))).toEqual([]);
    }
  );
});
