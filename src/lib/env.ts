import { z } from 'zod';

/**
 * Environment access, validated once at first use.
 *
 * Split deliberately: `publicEnv` is safe in the browser bundle, `serverEnv`
 * throws if anything reads it from client code. Keeping them apart is what
 * stops the service-role key from ever being inlined into a client component.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // 32 bytes, base64-encoded. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ENCRYPTION_KEY: z.string().min(1),
});

function format(error: z.ZodError, scope: string): never {
  const missing = error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid ${scope} environment configuration:\n${missing}\n\nSee .env.example.`);
}

let cachedPublic: z.infer<typeof publicSchema> | null = null;
let cachedServer: z.infer<typeof serverSchema> | null = null;

export function publicEnv() {
  if (cachedPublic) return cachedPublic;

  // Next.js inlines NEXT_PUBLIC_* only for statically analysable member
  // expressions, so these must be spelled out rather than looped over.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) format(parsed.error, 'public');
  cachedPublic = parsed.data;
  return cachedPublic;
}

export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called from the browser. Use publicEnv() instead.');
  }
  if (cachedServer) return cachedServer;

  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  });

  if (!parsed.success) format(parsed.error, 'server');
  cachedServer = parsed.data;
  return cachedServer;
}
