import type {
  Channel,
  ChannelType,
  Contact,
  Conversation,
  ConversationStatus,
  FlowRun,
  FlowRunStep,
  Message,
} from '@/lib/database.types';
import { MessagePayloadSchema, type MessagePayload } from '@/lib/schemas/message';
import type {
  InspectorRun,
  InspectorStep,
} from '@/components/RunInspector/RunInspector';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Reading data for the Unified Inbox.
 *
 * The one thing this screen has to get right is telling a member of staff, at a
 * glance, which conversations need them. So `needsHuman` is computed here and
 * drives the ordering — a handed-off conversation outranks a newer one the bot
 * is still handling.
 */

export interface InboxConversation {
  id: string;
  status: ConversationStatus;
  needsHuman: boolean;
  channelType: ChannelType;
  channelName: string;
  contactId: string;
  contactName: string;
  contactHandle: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  /** Null once the 24-hour window has closed, or on channels without one. */
  windowExpiresAt: string | null;
}

export interface InboxMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  author: string;
  status: string;
  payload: MessagePayload;
  error: string | null;
  createdAt: string;
}

type ConversationRow = Conversation & {
  channel: Pick<Channel, 'id' | 'type' | 'display_name'> | null;
  contact: Pick<Contact, 'id' | 'full_name' | 'phone'> | null;
};

/**
 * Conversations for the list pane.
 *
 * Ordered by whether a human is needed first, then recency. A team working
 * through a busy inbox should never have to hunt for the ones the bot gave up
 * on.
 */
export async function listConversations(
  ctx: WorkspaceContext,
  options: { filter?: 'all' | 'needs_human' | 'open' | 'resolved'; limit?: number } = {}
): Promise<InboxConversation[]> {
  const filter = options.filter ?? 'all';

  let query = ctx.db
    .from('conversations')
    .select('*, channel:channels(id, type, display_name), contact:contacts(id, full_name, phone)')
    .eq('workspace_id', ctx.workspaceId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(options.limit ?? 100);

  if (filter === 'needs_human') query = query.eq('needs_human', true);
  else if (filter === 'open') query = query.neq('status', 'resolved');
  else if (filter === 'resolved') query = query.eq('status', 'resolved');

  const { data } = await query;
  const rows = (data ?? []) as unknown as ConversationRow[];

  return rows
    .map(toInboxConversation)
    .sort((a, b) => {
      // Needs-a-human floats to the top regardless of recency.
      if (a.needsHuman !== b.needsHuman) return a.needsHuman ? -1 : 1;
      return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '');
    });
}

function toInboxConversation(row: ConversationRow): InboxConversation {
  const windowOpen =
    row.window_expires_at !== null && new Date(row.window_expires_at) > new Date();

  return {
    id: row.id,
    status: row.status,
    needsHuman: row.needs_human,
    channelType: row.channel?.type ?? 'simulator',
    channelName: row.channel?.display_name ?? 'Unknown',
    contactId: row.contact?.id ?? row.contact_id,
    contactName: row.contact?.full_name ?? row.contact?.phone ?? 'Unknown customer',
    contactHandle: row.contact?.phone ?? null,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    unreadCount: row.unread_count,
    windowExpiresAt: windowOpen ? row.window_expires_at : null,
  };
}

export interface InboxThread {
  conversation: InboxConversation;
  messages: InboxMessage[];
  /** The most recent automation run on this thread, for the inspector. */
  run: InspectorRun | null;
  steps: InspectorStep[];
}

export async function loadThread(
  ctx: WorkspaceContext,
  conversationId: string
): Promise<InboxThread | null> {
  const { data } = await ctx.db
    .from('conversations')
    .select('*, channel:channels(id, type, display_name), contact:contacts(id, full_name, phone)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('id', conversationId)
    .maybeSingle();

  if (!data) return null;

  // Messages and the latest run with its steps embedded, in one round trip each.
  const [messagesResult, runResult] = await Promise.all([
    ctx
      .table('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(300),
    ctx.db
      .from('flow_runs')
      .select('*, steps:flow_run_steps(*)')
      .eq('workspace_id', ctx.workspaceId)
      .eq('conversation_id', conversationId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const runRow = runResult.data as unknown as (FlowRun & { steps: FlowRunStep[] }) | null;

  return {
    conversation: toInboxConversation(data as unknown as ConversationRow),
    messages: ((messagesResult.data ?? []) as Message[]).map(toInboxMessage),
    run: runRow
      ? {
          id: runRow.id,
          status: runRow.status,
          currentNodeId: runRow.current_node_id,
          variables: (runRow.variables ?? {}) as Record<string, unknown>,
          error: runRow.error,
        }
      : null,
    // The embed returns steps unordered; the inspector reads top to bottom.
    steps: [...(runRow?.steps ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((step) => ({
        id: step.id,
        nodeId: step.node_id,
        nodeType: step.node_type,
        outcome: step.outcome,
        detail: (step.detail ?? {}) as Record<string, unknown>,
        durationMs: step.duration_ms,
        createdAt: step.created_at,
      })),
  };
}

function toInboxMessage(message: Message): InboxMessage {
  // A payload that fails to parse is rendered as-is rather than crashing the
  // one screen a person would use to work out what went wrong.
  const parsed = MessagePayloadSchema.safeParse(message.payload);

  return {
    id: message.id,
    direction: message.direction,
    author: message.author,
    status: message.status,
    payload: parsed.success ? parsed.data : { type: 'unsupported' },
    error: message.error,
    createdAt: message.created_at,
  };
}

/** The platform id to reply to, for whichever channel the thread is on. */
export async function recipientFor(
  ctx: WorkspaceContext,
  conversation: Conversation,
  channelType: ChannelType
): Promise<string | null> {
  const { data } = await ctx
    .table('contact_identities')
    .select<{ external_id: string }>('external_id')
    .eq('contact_id', conversation.contact_id)
    .eq('channel_type', channelType)
    .maybeSingle();

  if (data?.external_id) return data.external_id;

  // Fall back to the phone number: a contact created by an agent rather than an
  // inbound message may not have an identity row yet.
  const { data: contact } = await ctx
    .table('contacts')
    .select<{ phone: string | null }>('phone')
    .eq('id', conversation.contact_id)
    .maybeSingle();

  return contact?.phone ?? null;
}

/** Counts for the filter pills. */
export async function inboxCounts(
  ctx: WorkspaceContext
): Promise<{ all: number; needsHuman: number; open: number }> {
  const [all, needsHuman, open] = await Promise.all([
    ctx.db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId),
    ctx.db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
      .eq('needs_human', true),
    ctx.db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
      .neq('status', 'resolved'),
  ]);

  return {
    all: all.count ?? 0,
    needsHuman: needsHuman.count ?? 0,
    open: open.count ?? 0,
  };
}
