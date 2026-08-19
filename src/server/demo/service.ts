import { createHash, randomBytes } from 'node:crypto';
import type {
  Channel,
  Contact,
  Conversation,
  Message,
  Workspace,
} from '@/lib/database.types';
import { MessagePayloadSchema, type MessagePayload } from '@/lib/schemas/message';
import { supabaseAdmin } from '@/server/db/admin';
import { systemContext, type WorkspaceContext } from '@/server/db/tenancy';
import { seedVerticalData } from '@/server/domain/seed';
import { installFlowTemplate } from '@/server/flow/publish';
import {
  restaurantOrderGraph,
  RESTAURANT_ORDER_ENTRY,
} from '@/server/flow/templates/restaurant-order';
import { receiveInboundMessage } from '@/server/messaging/inbound';
import type { InboundMessage } from '@/server/channels/types';

/**
 * The public demo.
 *
 * An anonymous visitor drives the real engine — same inbound pipeline, same
 * router, same executor — inside a workspace that contains nothing but seeded
 * demo content. This is the site's central proof, so it must be genuinely the
 * product rather than a scripted imitation.
 *
 * Because it is an unauthenticated write path, everything here is bounded:
 * session length, message rate, and sessions per address.
 */

const DEMO_SLUG = 'xsender-public-demo';
const DEMO_NAME = 'Cafe Delight';

/** Bounds. Generous enough to finish an order, tight enough to be dull to abuse. */
export const DEMO_LIMITS = {
  /** Messages one visitor may send in a session. An order takes about eight. */
  messagesPerSession: 40,
  /** Messages per minute, per session. */
  messagesPerMinute: 15,
  /** New sessions per address per hour. */
  sessionsPerHourPerIp: 8,
} as const;

export class DemoLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoLimitError';
  }
}

export function hashIp(ip: string): string {
  // Salted with the app URL so hashes are not comparable across deployments,
  // and truncated because we only ever need equality, never the address.
  return createHash('sha256')
    .update(`${ip}:${process.env.NEXT_PUBLIC_APP_URL ?? 'local'}`)
    .digest('hex')
    .slice(0, 32);
}

export function newSessionToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * The demo workspace, provisioning it on first use.
 *
 * Self-healing rather than a deployment step: a marketing site whose central
 * proof depends on someone remembering to run a script is a marketing site that
 * will one day show an error to a prospect.
 *
 * Created directly rather than through create_workspace(), which expects a real
 * auth user to own it. This one has no members and no one can sign into it.
 */
export async function ensureDemoWorkspace(): Promise<WorkspaceContext> {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from('workspaces')
    .select('*')
    .eq('slug', DEMO_SLUG)
    .maybeSingle();

  if (existing) return systemContext((existing as Workspace).id);

  const { data: created, error } = await db
    .from('workspaces')
    .insert({
      name: DEMO_NAME,
      slug: DEMO_SLUG,
      vertical: 'restaurant',
      timezone: 'UTC',
      currency: 'USD',
      locale: 'en-US',
      country_code: null,
      onboarded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Could not provision the demo workspace: ${error?.message}`);
  }

  const ctx = await systemContext((created as Workspace).id);

  await ctx.table('channels').insert({
    type: 'simulator',
    status: 'connected',
    display_name: 'Demo',
    connected_at: new Date().toISOString(),
  });

  await seedVerticalData(ctx, 'restaurant');

  await installFlowTemplate(ctx, {
    name: 'Restaurant ordering',
    description: 'Public demo flow.',
    vertical: 'restaurant',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    graph: restaurantOrderGraph(DEMO_NAME),
    entryNodeId: RESTAURANT_ORDER_ENTRY,
    publish: true,
  });

  return ctx;
}

export interface DemoSession {
  id: string;
  token: string;
  ctx: WorkspaceContext;
  channel: Channel;
  contact: Contact;
  conversation: Conversation;
  messageCount: number;
}

type SessionRow = {
  id: string;
  token: string;
  workspace_id: string;
  contact_id: string;
  conversation_id: string;
  message_count: number;
  last_message_at: string;
};

async function demoChannel(ctx: WorkspaceContext): Promise<Channel> {
  const { data } = await ctx.table('channels').select().eq('type', 'simulator').maybeSingle();
  if (data) return data;

  const { data: created, error } = await ctx
    .table('channels')
    .insert({
      type: 'simulator',
      status: 'connected',
      display_name: 'Demo',
      connected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !created) throw new Error(`Could not create the demo channel: ${error?.message}`);
  return created;
}

/** Find an existing session by its cookie token. */
export async function loadSession(token: string): Promise<DemoSession | null> {
  const db = supabaseAdmin();

  const { data } = await db.from('demo_sessions').select('*').eq('token', token).maybeSingle();
  if (!data) return null;

  const row = data as SessionRow;
  const ctx = await systemContext(row.workspace_id);

  const [contactResult, conversationResult, channel] = await Promise.all([
    ctx.table('contacts').select().eq('id', row.contact_id).maybeSingle(),
    ctx.table('conversations').select().eq('id', row.conversation_id).maybeSingle(),
    demoChannel(ctx),
  ]);

  // The reaper may have removed the underlying rows; treat that as no session
  // rather than an error, and the caller will start a fresh one.
  if (!contactResult.data || !conversationResult.data) return null;

  return {
    id: row.id,
    token: row.token,
    ctx,
    channel,
    contact: contactResult.data,
    conversation: conversationResult.data,
    messageCount: row.message_count,
  };
}

/** Start a session: its own throwaway contact and conversation. */
export async function createSession(ipHash: string | null): Promise<DemoSession> {
  const db = supabaseAdmin();

  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from('demo_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);

    if ((count ?? 0) >= DEMO_LIMITS.sessionsPerHourPerIp) {
      throw new DemoLimitError(
        'That is a lot of demos from one place. Try again in an hour, or start a free account to use the real thing.'
      );
    }
  }

  const ctx = await ensureDemoWorkspace();
  const channel = await demoChannel(ctx);
  const token = newSessionToken();

  const { data: contact, error: contactError } = await ctx
    .table('contacts')
    .insert({ full_name: 'Demo visitor', tags: ['demo'] })
    .select()
    .single();

  if (contactError || !contact) {
    throw new Error(`Could not start the demo: ${contactError?.message}`);
  }

  await ctx.table('contact_identities').insert({
    contact_id: contact.id,
    channel_type: 'simulator',
    external_id: token,
    display_name: 'Demo visitor',
  });

  const { data: conversation, error: conversationError } = await ctx
    .table('conversations')
    .insert({ contact_id: contact.id, channel_id: channel.id, status: 'open' })
    .select()
    .single();

  if (conversationError || !conversation) {
    throw new Error(`Could not start the demo: ${conversationError?.message}`);
  }

  const { data: session, error: sessionError } = await db
    .from('demo_sessions')
    .insert({
      token,
      workspace_id: ctx.workspaceId,
      contact_id: contact.id,
      conversation_id: conversation.id,
      ip_hash: ipHash,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw new Error(`Could not start the demo: ${sessionError?.message}`);
  }

  return {
    id: (session as SessionRow).id,
    token,
    ctx,
    channel,
    contact,
    conversation,
    messageCount: 0,
  };
}

/** Send a message as the demo visitor, through the real inbound pipeline. */
export async function sendDemoMessage(
  session: DemoSession,
  payload: MessagePayload
): Promise<void> {
  if (session.messageCount >= DEMO_LIMITS.messagesPerSession) {
    throw new DemoLimitError(
      'That is the end of the demo. Start a free account to keep going with your own menu.'
    );
  }

  await enforceRate(session);

  const parsed = MessagePayloadSchema.parse(payload);

  const input: InboundMessage = {
    externalId: null,
    externalUserId: session.token,
    channelType: 'simulator',
    payload: parsed,
    senderName: 'Demo visitor',
    timestamp: new Date(),
  };

  await receiveInboundMessage(session.ctx, session.channel, input);

  await supabaseAdmin()
    .from('demo_sessions')
    .update({
      message_count: session.messageCount + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', session.id);
}

/**
 * Per-minute throttle, counted from the messages themselves rather than a
 * separate store — there is no Redis here, and the rows are already indexed by
 * conversation and time.
 */
async function enforceRate(session: DemoSession): Promise<void> {
  const since = new Date(Date.now() - 60_000).toISOString();

  const { count } = await session.ctx.db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', session.conversation.id)
    .eq('direction', 'inbound')
    .gte('created_at', since);

  if ((count ?? 0) >= DEMO_LIMITS.messagesPerMinute) {
    throw new DemoLimitError('Slow down a moment — try again in a few seconds.');
  }
}

export interface DemoTranscript {
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    payload: MessagePayload;
    createdAt: string;
  }>;
  /** True once the flow has produced an order, so the UI can celebrate it. */
  orderPlaced: boolean;
  orderCode: string | null;
  messagesRemaining: number;
}

export async function loadTranscript(session: DemoSession): Promise<DemoTranscript> {
  const [messagesResult, orderResult] = await Promise.all([
    session.ctx
      .table('messages')
      .select()
      .eq('conversation_id', session.conversation.id)
      .order('created_at', { ascending: true })
      .limit(120),
    session.ctx
      .table('orders')
      .select()
      .eq('contact_id', session.contact.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const messages = ((messagesResult.data ?? []) as Message[]).map((message) => {
    const parsed = MessagePayloadSchema.safeParse(message.payload);
    return {
      id: message.id,
      direction: message.direction as 'inbound' | 'outbound',
      payload: parsed.success
        ? parsed.data
        : ({ type: 'unsupported' } satisfies MessagePayload),
      createdAt: message.created_at,
    };
  });

  return {
    messages,
    orderPlaced: Boolean(orderResult.data),
    orderCode: orderResult.data?.code ?? null,
    messagesRemaining: Math.max(0, DEMO_LIMITS.messagesPerSession - session.messageCount),
  };
}
