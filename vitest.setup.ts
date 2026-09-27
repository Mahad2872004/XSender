import { randomBytes } from 'node:crypto';

/**
 * Environment for unit tests.
 *
 * `src/lib/env.ts` validates on first read and throws if anything is missing,
 * so any module that touches server config needs these present before it is
 * imported. Values are fakes: unit tests must never reach a real project, and a
 * test that needs the live database belongs in `npm run smoke` instead.
 *
 * `||=` so a developer can still point a single run at real values.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.NEXT_PUBLIC_APP_URL ||= 'http://localhost:3000';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.ENCRYPTION_KEY ||= randomBytes(32).toString('base64');

// Meta credentials — the webhook signature tests sign with this exact secret.
process.env.META_APP_SECRET ||= 'test-app-secret';
process.env.META_WEBHOOK_VERIFY_TOKEN ||= 'test-verify-token';
process.env.META_GRAPH_VERSION ||= 'v21.0';
