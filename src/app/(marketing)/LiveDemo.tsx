'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw, Send, Sparkles } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { MessagePayload } from '@/lib/schemas/message';
import { PUBLIC } from '@/lib/routes';
import styles from './live-demo.module.css';

/**
 * The homepage's central proof: a stranger ordering from the real engine.
 *
 * Every message here goes through the same inbound pipeline, router and
 * executor a paying customer's WhatsApp does. That is the entire argument —
 * a scripted mock would be indistinguishable to us and worthless to a
 * prospect who tries something the script did not anticipate.
 */

type DemoMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  payload: MessagePayload;
  createdAt: string;
};

type Transcript = {
  messages: DemoMessage[];
  orderPlaced: boolean;
  orderCode: string | null;
  messagesRemaining: number;
};

export default function LiveDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const threadRef = useRef<HTMLDivElement>(null);
  const celebrated = useRef(false);

  const apply = useCallback((transcript: Transcript) => {
    setMessages(transcript.messages);
    setOrderCode(transcript.orderCode);

    if (transcript.orderPlaced && !celebrated.current) {
      celebrated.current = true;
      track('demo_order_completed', { code: transcript.orderCode ?? '' });
    }
  }, []);

  const call = useCallback(
    async (action: 'start' | 'send', payload?: MessagePayload) => {
      setBusy(true);
      setError(null);

      try {
        const response = await fetch('/api/demo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, payload }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? 'Something went wrong.');
          return;
        }

        apply(data as Transcript);
      } catch {
        setError('Could not reach the demo. Check your connection and try again.');
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  async function begin() {
    setStarted(true);
    track('demo_opened');
    await call('send', { type: 'text', text: 'Hi' });
  }

  async function send(payload: MessagePayload) {
    track('demo_message_sent');
    await call('send', payload);
  }

  async function reset() {
    await fetch('/api/demo', { method: 'DELETE' });
    celebrated.current = false;
    setMessages([]);
    setOrderCode(null);
    setStarted(false);
    setError(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void send({ type: 'text', text });
  }

  // Options come from the bot's most recent message, exactly as they would on
  // a real phone.
  const lastBot = [...messages].reverse().find((m) => m.direction === 'outbound');
  const choices = busy ? [] : choicesFrom(lastBot?.payload);

  return (
    <div className={styles.wrapper}>
      <div className={styles.phone}>
        <div className={styles.bar}>
          <span className={styles.avatar}>C</span>
          <div className={styles.barText}>
            <span className={styles.barName}>Cafe Delight</span>
            <span className={styles.barStatus}>
              {busy ? 'typing…' : 'replies instantly'}
            </span>
          </div>
          {started && (
            <button type="button" className={styles.reset} onClick={reset} title="Start again">
              <RotateCcw size={15} />
            </button>
          )}
        </div>

        <div className={styles.thread} ref={threadRef}>
          {!started && (
            <div className={styles.intro}>
              <Sparkles size={24} className={styles.introIcon} />
              <p className={styles.introTitle}>This one is real</p>
              <p className={styles.introBody}>
                Not a recording. You are about to talk to the same engine our customers
                run on WhatsApp — order something and watch it take the order.
              </p>
              <button type="button" className={styles.startBtn} onClick={begin} disabled={busy}>
                Start the conversation
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

          {busy && started && (
            <div className={styles.rowLeft}>
              <div className={styles.typing} aria-label="Replying">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {orderCode && (
          <div className={styles.success}>
            Order <strong>{orderCode}</strong> was just created — a real record, with no
            one from the business involved.
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {started && (
          <>
            {choices.length > 0 && (
              <div className={styles.choices}>
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={styles.choice}
                    disabled={busy}
                    onClick={() =>
                      void send({ type: 'reply', replyId: choice.id, title: choice.title })
                    }
                  >
                    {choice.title}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className={styles.composer}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={styles.input}
                placeholder="Or type anything…"
                aria-label="Message"
                disabled={busy}
              />
              <button type="submit" className={styles.send} disabled={busy} aria-label="Send">
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>

      <p className={styles.footnote}>
        Try going off-script — ask for something that isn&rsquo;t on the menu and watch it
        hand you to a person rather than guess.{' '}
        <Link href={PUBLIC.signup} className={styles.footnoteLink} data-cta="demo-inline-signup">
          Do this with your own menu →
        </Link>
      </p>
    </div>
  );
}

function Bubble({ message }: { message: DemoMessage }) {
  const fromVisitor = message.direction === 'inbound';
  const { payload } = message;

  return (
    <div className={fromVisitor ? styles.rowRight : styles.rowLeft}>
      <div className={fromVisitor ? styles.bubbleOut : styles.bubbleIn}>
        <p className={styles.text}>{textOf(payload)}</p>
      </div>
    </div>
  );
}

function textOf(payload: MessagePayload): string {
  switch (payload.type) {
    case 'text':
    case 'buttons':
    case 'list':
      return payload.text;
    case 'reply':
      return payload.title;
    case 'location':
      return payload.name ?? 'Shared a location';
    case 'template':
      return payload.name;
    default:
      return `[${payload.type}]`;
  }
}

function choicesFrom(payload: MessagePayload | undefined): Array<{ id: string; title: string }> {
  if (!payload) return [];
  if (payload.type === 'buttons') return payload.buttons;
  if (payload.type === 'list') {
    return payload.sections.flatMap((s) => s.rows.map((r) => ({ id: r.id, title: r.title })));
  }
  return [];
}
