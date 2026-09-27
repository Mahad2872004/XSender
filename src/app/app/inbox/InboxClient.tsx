'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  CircleUserRound,
  Inbox as InboxIcon,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import type { ChannelType } from '@/lib/database.types';
import type { MessagePayload } from '@/lib/schemas/message';
import LocalTime from '@/components/LocalTime/LocalTime';
import RunInspector from '@/components/RunInspector/RunInspector';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { InboxConversation, InboxMessage, InboxThread } from '@/server/inbox/service';
import {
  handBackToBot,
  markRead,
  resolveConversation,
  sendReply,
  takeOver,
} from './actions';
import { EMPTY_INBOX_STATE } from './form-state';
import styles from './inbox.module.css';

/**
 * The Unified Inbox.
 *
 * The screen's one job is to answer "which of these needs me?" in a glance.
 * That is carried by colour and position, not a label you have to read: threads
 * the bot gave up on are tinted and sorted to the top, ones it is handling sit
 * quietly below.
 */

type Filter = 'all' | 'needs_human' | 'open' | 'resolved';

const CHANNEL_LABEL: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  simulator: 'Simulator',
};

export default function InboxClient({
  workspaceId,
  conversations,
  counts,
  filter,
  selectedId,
  thread,
  canReply,
}: {
  workspaceId: string;
  conversations: InboxConversation[];
  counts: { all: number; needsHuman: number; open: number };
  filter: Filter;
  selectedId: string | null;
  thread: InboxThread | null;
  canReply: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, submit] = useActionState(sendReply, EMPTY_INBOX_STATE);
  const [pending, startTransition] = useTransition();
  const [inspecting, setInspecting] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Live updates.
   *
   * Subscribed to the workspace's messages and conversations rather than the
   * open thread alone: a new message in another conversation has to move it up
   * the list, which is most of the point of an inbox.
   */
  useEffect(() => {
    const supabase = supabaseBrowser();

    const channel = supabase
      .channel(`inbox:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, router]);

  // Keep the newest message in view.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [thread?.messages.length, selectedId]);

  // Clear the unread badge once a thread is actually on screen.
  useEffect(() => {
    if (selectedId) void markRead(selectedId);
  }, [selectedId]);

  /**
   * Clear the composer the instant it is submitted, so sending feels immediate.
   * A rejected send comes back carrying the text, and the `key` below remounts
   * the input with it restored — no effect, and nothing typed is ever lost.
   */
  function send(formData: FormData) {
    formRef.current?.reset();
    submit(formData);
  }

  function hrefFor(next: Partial<{ c: string; filter: Filter }>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.c !== undefined) params.set('c', next.c);
    if (next.filter !== undefined) {
      params.set('filter', next.filter);
      params.delete('c');
    }
    return `${pathname}?${params.toString()}`;
  }

  const conversation = thread?.conversation;
  const windowClosed =
    conversation?.channelType === 'whatsapp' && conversation.windowExpiresAt === null;

  return (
    <div className={`${styles.layout} ${inspecting && conversation ? styles.layoutInspecting : ''}`}>
      {/* ---------- List ---------- */}
      <aside className={styles.list}>
        <div className={styles.filters}>
          <FilterPill href={hrefFor({ filter: 'all' })} active={filter === 'all'} label="All" count={counts.all} />
          <FilterPill
            href={hrefFor({ filter: 'needs_human' })}
            active={filter === 'needs_human'}
            label="Needs you"
            count={counts.needsHuman}
            urgent
          />
          <FilterPill href={hrefFor({ filter: 'open' })} active={filter === 'open'} label="Open" count={counts.open} />
        </div>

        <div className={styles.conversations}>
          {conversations.length === 0 && (
            <div className={styles.listEmpty}>
              <InboxIcon size={20} className={styles.listEmptyIcon} />
              <p className={styles.listEmptyTitle}>Nothing here yet</p>
              <p className={styles.listEmptyBody}>
                Conversations appear the moment a customer messages a connected channel.
              </p>
            </div>
          )}

          {conversations.map((item) => (
            <Link
              key={item.id}
              href={hrefFor({ c: item.id })}
              scroll={false}
              className={[
                styles.item,
                item.id === selectedId ? styles.itemActive : '',
                item.needsHuman ? styles.itemNeedsHuman : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.itemTop}>
                <span className={styles.itemName}>{item.contactName}</span>
                {item.lastMessageAt && (
                  <LocalTime value={item.lastMessageAt} className={styles.itemTime} />
                )}
              </div>

              <p className={styles.itemPreview}>{item.lastMessagePreview ?? 'No messages yet'}</p>

              <div className={styles.itemMeta}>
                <span className={styles.channelBadge}>{CHANNEL_LABEL[item.channelType]}</span>
                {item.needsHuman ? (
                  <span className={styles.needsHumanTag}>
                    <UserRound size={11} />
                    Needs you
                  </span>
                ) : (
                  <span className={styles.botTag}>
                    <Bot size={11} />
                    Bot handling
                  </span>
                )}
                {item.unreadCount > 0 && <span className={styles.unread}>{item.unreadCount}</span>}
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* ---------- Thread ---------- */}
      <section className={styles.thread}>
        {!conversation && (
          <div className={styles.threadEmpty}>
            <CircleUserRound size={26} className={styles.threadEmptyIcon} />
            <p className={styles.threadEmptyTitle}>Pick a conversation</p>
            <p className={styles.threadEmptyBody}>
              Threads the bot handed over are highlighted and sorted to the top.
            </p>
          </div>
        )}

        {conversation && (
          <>
            <header className={styles.threadHeader}>
              <div className={styles.threadWho}>
                <span className={styles.threadName}>{conversation.contactName}</span>
                <span className={styles.threadSub}>
                  {CHANNEL_LABEL[conversation.channelType]}
                  {conversation.contactHandle ? ` · ${conversation.contactHandle}` : ''}
                </span>
              </div>

              <div className={styles.threadActions}>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${inspecting ? styles.secondaryBtnOn : ''}`}
                  title="See every step the automation took on this conversation"
                  onClick={() => setInspecting((open) => !open)}
                >
                  <Search size={14} />
                  Why this reply?
                </button>

                {conversation.needsHuman ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={pending}
                    title="Let the automation take this conversation again"
                    onClick={() => startTransition(() => void handBackToBot(conversation.id))}
                  >
                    <Bot size={14} />
                    Back to bot
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={pending}
                    title="Stop the bot and handle this yourself"
                    onClick={() => startTransition(() => void takeOver(conversation.id))}
                  >
                    <UserRound size={14} />
                    Take over
                  </button>
                )}

                {conversation.status !== 'resolved' && (
                  <button
                    type="button"
                    className={styles.resolveBtn}
                    disabled={pending}
                    onClick={() => startTransition(() => void resolveConversation(conversation.id))}
                  >
                    <Check size={14} />
                    Resolve
                  </button>
                )}
              </div>
            </header>

            {conversation.needsHuman && (
              <div className={styles.handoffBanner}>
                <UserRound size={15} />
                <span>
                  The bot handed this over — it met something it was not built for. The customer
                  has been told a person is coming.
                </span>
              </div>
            )}

            <div className={styles.messages} ref={threadRef}>
              {thread.messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
            </div>

            {windowClosed && (
              <div className={styles.windowBanner}>
                <AlertTriangle size={15} />
                <span>
                  This customer last wrote over 24 hours ago. WhatsApp only allows an approved
                  template until they message again.
                </span>
              </div>
            )}

            {state.error && (
              <p className={styles.error}>
                <AlertTriangle size={14} />
                {state.error}
              </p>
            )}

            {canReply ? (
              <form ref={formRef} action={send} className={styles.composer}>
                <input type="hidden" name="conversationId" value={conversation.id} />
                <input
                  // Remounts with the rejected text restored when a send fails.
                  key={state.attempted ?? ''}
                  name="text"
                  defaultValue={state.attempted ?? ''}
                  className={styles.composerInput}
                  placeholder={windowClosed ? 'Messaging window closed' : 'Reply as your team…'}
                  autoComplete="off"
                  disabled={windowClosed}
                />
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={windowClosed}
                  aria-label="Send reply"
                >
                  <Send size={17} />
                </button>
              </form>
            ) : (
              <p className={styles.readOnly}>
                Your role can read conversations but not reply.
              </p>
            )}
          </>
        )}
      </section>

      {/* ---------- Inspector ----------
          Same panel as the Simulator's: when a real customer gets an odd reply,
          working out why should not require reproducing it in a test harness. */}
      {inspecting && conversation && (
        <section className={styles.inspectorPane}>
          <button
            type="button"
            className={styles.inspectorClose}
            onClick={() => setInspecting(false)}
            aria-label="Close the inspector"
          >
            <X size={15} />
          </button>
          <RunInspector
            run={thread.run}
            steps={thread.steps}
            flush
            emptyMessage="No automation has run on this conversation. Either no flow is published, or a person has been handling it from the start."
          />
        </section>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  count,
  urgent,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={[
        styles.filterPill,
        active ? styles.filterPillActive : '',
        urgent && count > 0 ? styles.filterPillUrgent : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
      <span className={styles.filterCount}>{count}</span>
    </Link>
  );
}

function Bubble({ message }: { message: InboxMessage }) {
  const outbound = message.direction === 'outbound';
  const fromAgent = message.author === 'agent';

  return (
    <div className={outbound ? styles.rowRight : styles.rowLeft}>
      <div className={outbound ? (fromAgent ? styles.bubbleAgent : styles.bubbleBot) : styles.bubbleIn}>
        {outbound && (
          <span className={styles.bubbleAuthor}>
            {fromAgent ? <UserRound size={11} /> : <Bot size={11} />}
            {fromAgent ? 'You' : 'Automation'}
          </span>
        )}

        <p className={styles.text}>{describe(message.payload)}</p>

        <span className={styles.bubbleMeta}>
          <LocalTime value={message.createdAt} />
          {outbound && <DeliveryTick status={message.status} />}
        </span>

        {message.error && <span className={styles.bubbleError}>{message.error}</span>}
      </div>
    </div>
  );
}

/** WhatsApp's own vocabulary: one tick sent, two delivered, two blue read. */
function DeliveryTick({ status }: { status: string }) {
  if (status === 'failed') return <AlertTriangle size={12} className={styles.tickFailed} />;
  if (status === 'read') return <CheckCheck size={13} className={styles.tickRead} />;
  if (status === 'delivered') return <CheckCheck size={13} className={styles.tick} />;
  if (status === 'sent') return <Check size={13} className={styles.tick} />;
  return null;
}

function describe(payload: MessagePayload): string {
  switch (payload.type) {
    case 'text':
    case 'buttons':
    case 'list':
      return payload.text;
    case 'reply':
      return payload.title;
    case 'location':
      return `📍 ${payload.name ?? payload.address ?? 'Shared a location'}`;
    case 'template':
      return `Template: ${payload.name}`;
    case 'unsupported':
      return 'Unsupported message type';
    default:
      return `[${payload.type}]`;
  }
}
