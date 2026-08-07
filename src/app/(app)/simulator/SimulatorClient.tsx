'use client';

import {
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import { RotateCcw, Send, Sparkles, AlertTriangle } from 'lucide-react';
import type { MessageAuthor, MessageDirection, MessageStatus } from '@/lib/database.types';
import type { MessagePayload } from '@/lib/schemas/message';
import LocalTime from '@/components/LocalTime/LocalTime';
import {
  installRestaurantDemo,
  resetSimulatedConversation,
  sendSimulatedText,
  tapSimulatedReply,
} from './actions';
import { EMPTY_SIMULATOR_STATE } from './form-state';
import RunInspector, { type InspectorRun, type InspectorStep } from './RunInspector';
import styles from './simulator.module.css';

export type SimulatorMessage = {
  id: string;
  direction: MessageDirection;
  author: MessageAuthor;
  status: MessageStatus;
  createdAt: string;
  payload: MessagePayload;
  error: string | null;
};

export default function SimulatorClient({
  workspaceName,
  messages,
  hasPublishedFlow,
  run,
  steps,
}: {
  workspaceName: string;
  messages: SimulatorMessage[];
  hasPublishedFlow: boolean;
  run: InspectorRun | null;
  steps: InspectorStep[];
}) {
  const [state, submit] = useActionState(sendSimulatedText, EMPTY_SIMULATOR_STATE);
  const [pending, startTransition] = useTransition();
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * The customer's own message appears immediately, before the server has
   * replied. The round trip to the database region is ~265ms and the flow may
   * take several, so without this the composer looks frozen after every send.
   * React drops the optimistic entry once the real row arrives.
   */
  const [visibleMessages, addOptimistic] = useOptimistic(
    messages,
    (current, pendingText: string): SimulatorMessage[] => [
      ...current,
      {
        id: `optimistic-${current.length}`,
        direction: 'inbound',
        author: 'customer',
        status: 'queued',
        createdAt: new Date().toISOString(),
        payload: { type: 'text', text: pendingText },
        error: null,
      },
    ]
  );

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleMessages.length]);

  // If the send was rejected, put the text back so it is not silently lost.
  useEffect(() => {
    if (state.error && state.attempted) {
      const input = formRef.current?.elements.namedItem('text');
      if (input instanceof HTMLInputElement) input.value = state.attempted;
    }
  }, [state]);

  const lastBotMessage = [...visibleMessages].reverse().find((m) => m.direction === 'outbound');
  // Hide the choices while a reply is in flight, so a double-tap cannot send
  // two answers to the same question.
  const choices = pending ? [] : choicesFrom(lastBotMessage?.payload);

  function tap(id: string, title: string) {
    startTransition(async () => {
      addOptimistic(title);
      await tapSimulatedReply(id, title);
    });
  }

  function send(formData: FormData) {
    const text = String(formData.get('text') ?? '').trim();
    if (text) addOptimistic(text);
    // Reset now rather than in an effect: the field is cleared the instant the
    // optimistic bubble appears, which is what makes the send feel immediate.
    formRef.current?.reset();
    submit(formData);
  }

  return (
    <div className={styles.layout}>
      <section className={styles.phoneColumn}>
        <div className={styles.phoneHeader}>
          <div>
            <h2 className={styles.phoneTitle}>{workspaceName}</h2>
            <span className={styles.phoneSubtitle}>Simulated customer · not a real channel</span>
          </div>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => startTransition(() => void resetSimulatedConversation())}
            disabled={pending}
            title="Resolve this conversation so the first-contact path runs again"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>

        <div className={styles.phone}>
          <div className={styles.thread} ref={scrollRef}>
            {visibleMessages.length === 0 && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No messages yet</p>
                <p className={styles.emptyBody}>
                  {hasPublishedFlow
                    ? 'Say “hi” below to trigger your published flow.'
                    : 'Install the restaurant demo to have something to run, then say “hi”.'}
                </p>
                {!hasPublishedFlow && (
                  <button
                    type="button"
                    className={styles.installBtn}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await installRestaurantDemo();
                        setInstallNotice(result.error ?? result.notice);
                      })
                    }
                  >
                    <Sparkles size={15} />
                    Install restaurant demo
                  </button>
                )}
                {installNotice && <p className={styles.emptyNotice}>{installNotice}</p>}
              </div>
            )}

            {visibleMessages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </div>

          {choices.length > 0 && (
            <div className={styles.choices}>
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={styles.choice}
                  disabled={pending}
                  onClick={() => tap(choice.id, choice.title)}
                >
                  {choice.title}
                </button>
              ))}
            </div>
          )}

          <form ref={formRef} action={send} className={styles.composer}>
            <input
              name="text"
              className={styles.composerInput}
              placeholder="Type as the customer…"
              autoComplete="off"
            />
            <button type="submit" className={styles.sendBtn} aria-label="Send">
              <Send size={17} />
            </button>
          </form>

          {state.error && (
            <p className={styles.error}>
              <AlertTriangle size={14} />
              {state.error}
            </p>
          )}
        </div>
      </section>

      <RunInspector run={run} steps={steps} />
    </div>
  );
}

function Bubble({ message }: { message: SimulatorMessage }) {
  const fromCustomer = message.direction === 'inbound';
  const { payload } = message;

  return (
    <div className={fromCustomer ? styles.rowRight : styles.rowLeft}>
      <div className={fromCustomer ? styles.bubbleOut : styles.bubbleIn}>
        {renderBody(payload)}

        <span className={styles.meta}>
          <LocalTime value={message.createdAt} />
          {message.status === 'failed' && <span className={styles.failed}> · failed</span>}
        </span>

        {message.error && <span className={styles.bubbleError}>{message.error}</span>}
      </div>
    </div>
  );
}

function renderBody(payload: MessagePayload) {
  switch (payload.type) {
    case 'text':
      return <p className={styles.text}>{payload.text}</p>;

    case 'buttons':
      return (
        <>
          <p className={styles.text}>{payload.text}</p>
          <div className={styles.inlineOptions}>
            {payload.buttons.map((b) => (
              <span key={b.id} className={styles.inlineOption}>
                {b.title}
              </span>
            ))}
          </div>
        </>
      );

    case 'list':
      return (
        <>
          <p className={styles.text}>{payload.text}</p>
          <div className={styles.inlineOptions}>
            {payload.sections
              .flatMap((s) => s.rows)
              .map((row) => (
                <span key={row.id} className={styles.inlineOption}>
                  {row.title}
                </span>
              ))}
          </div>
        </>
      );

    case 'reply':
      return <p className={styles.text}>{payload.title}</p>;

    case 'image':
    case 'video':
    case 'audio':
    case 'document':
      return (
        <p className={styles.text}>
          <span className={styles.mediaTag}>{payload.type}</span>
          {payload.caption ?? payload.mediaUrl}
        </p>
      );

    case 'location':
      return <p className={styles.text}>📍 {payload.name ?? payload.address ?? 'Location'}</p>;

    case 'template':
      return (
        <p className={styles.text}>
          <span className={styles.mediaTag}>template</span>
          {payload.name}
        </p>
      );

    default:
      return <p className={styles.text}>Unsupported message</p>;
  }
}

/** Options the customer can tap, taken from the bot's most recent message. */
function choicesFrom(payload: MessagePayload | undefined): Array<{ id: string; title: string }> {
  if (!payload) return [];
  if (payload.type === 'buttons') return payload.buttons;
  if (payload.type === 'list') {
    return payload.sections.flatMap((s) => s.rows.map((r) => ({ id: r.id, title: r.title })));
  }
  return [];
}
