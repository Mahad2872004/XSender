'use client';

import {
  useActionState,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Link2Off,
  Plug,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { ChannelStatus, ChannelType } from '@/lib/database.types';
import {
  connectWhatsAppAction,
  disconnectChannelAction,
  recheckChannelAction,
} from './actions';
import { EMPTY_CONNECT_STATE } from './form-state';
import styles from './channels.module.css';

/**
 * Channels.
 *
 * WhatsApp only, deliberately. The adapter interface supports Instagram and
 * Messenger and the work is mostly wiring, but offering three channels before
 * one has a retained pilot client only delays the first real conversation. They
 * arrive in Phase 7.
 */

export interface ChannelRow {
  id: string;
  type: ChannelType;
  status: ChannelStatus;
  displayName: string;
  phoneNumber: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  lastError: string | null;
  connectedAt: string | null;
}

const STATUS_COPY: Record<ChannelStatus, { label: string; tone: string }> = {
  connected: { label: 'Live', tone: styles.toneGood },
  connecting: { label: 'Connecting', tone: styles.toneWarn },
  disconnected: { label: 'Not connected', tone: styles.toneMuted },
  error: { label: 'Needs attention', tone: styles.toneBad },
};

export default function ChannelsClient({
  channels,
  canManage,
  metaConfigured,
}: {
  channels: ChannelRow[];
  canManage: boolean;
  metaConfigured: boolean;
}) {
  const [state, submit, submitting] = useActionState(connectWhatsAppAction, EMPTY_CONNECT_STATE);
  const [pending, startTransition] = useTransition();

  const live = channels.filter((c) => c.status === 'connected');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Channels</h1>
          <p className={styles.subtitle}>
            Attach the WhatsApp number your customers already message. Everything the automation
            sends and receives goes through here.
          </p>
        </div>
      </header>

      {!metaConfigured && (
        <div className={styles.notice}>
          <AlertTriangle size={16} />
          <div>
            <strong>Meta credentials are not set on this server.</strong> Add{' '}
            <code>META_APP_SECRET</code> and <code>META_WEBHOOK_VERIFY_TOKEN</code> to the
            environment before connecting a number — until then inbound webhooks are refused and a
            connect attempt will fail.
          </div>
        </div>
      )}

      {/* ---------- Connected numbers ---------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your numbers</h2>

        {channels.length === 0 ? (
          <div className={styles.empty}>
            <Plug size={20} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No number connected yet</p>
            <p className={styles.emptyBody}>
              Until one is, automation runs only in the Simulator. Conversations, orders and the
              hours-saved figure all start from a real connected number.
            </p>
          </div>
        ) : (
          <ul className={styles.channelList}>
            {channels.map((channel) => {
              const status = STATUS_COPY[channel.status];
              return (
                <li key={channel.id} className={styles.channelCard}>
                  <div className={styles.channelMain}>
                    <div className={styles.channelTop}>
                      <span className={styles.channelName}>{channel.displayName}</span>
                      <span className={`${styles.statusPill} ${status.tone}`}>{status.label}</span>
                    </div>
                    <p className={styles.channelMeta}>
                      {channel.phoneNumber ?? 'Number hidden'}
                      {channel.phoneNumberId ? ` · ID ${channel.phoneNumberId}` : ''}
                      {channel.wabaId ? ` · WABA ${channel.wabaId}` : ''}
                    </p>
                    {channel.lastError && (
                      <p className={styles.channelError}>
                        <AlertTriangle size={13} />
                        {channel.lastError}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className={styles.channelActions}>
                      {channel.status !== 'disconnected' && (
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => void recheckChannelAction(channel.id))
                          }
                        >
                          <RefreshCw size={13} />
                          Re-check
                        </button>
                      )}
                      {channel.status !== 'disconnected' && (
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => void disconnectChannelAction(channel.id))
                          }
                        >
                          <Link2Off size={13} />
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Connect ---------- */}
      {canManage && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {live.length > 0 ? 'Connect another number' : 'Connect WhatsApp'}
          </h2>

          <div className={styles.connectGrid}>
            <form action={submit} className={styles.form}>
              <Field
                label="Label"
                name="displayName"
                defaultValue={state.values?.displayName ?? ''}
                placeholder="Main line"
                hint="Only shown inside xSender, so your team can tell numbers apart."
              />
              <Field
                label="Phone number ID"
                name="phoneNumberId"
                defaultValue={state.values?.phoneNumberId ?? ''}
                placeholder="123456789012345"
                hint="Meta dashboard → WhatsApp → API Setup. All digits — not the phone number itself."
                required
              />
              <Field
                label="WhatsApp Business Account ID"
                name="wabaId"
                defaultValue={state.values?.wabaId ?? ''}
                placeholder="Optional"
                hint="Not needed to send. Useful when Meta support asks for it."
              />
              <Field
                label="Permanent access token"
                name="accessToken"
                type="password"
                placeholder="EAAG…"
                hint="Encrypted before it is stored, and never shown again after saving."
                required
              />

              {state.error && (
                <p className={styles.formError}>
                  <AlertTriangle size={14} />
                  {state.error}
                </p>
              )}

              <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                <ShieldCheck size={15} />
                {submitting ? 'Checking with Meta…' : 'Verify and connect'}
              </button>

              <p className={styles.formFoot}>
                We call Meta to confirm the token works before saving anything. Nothing is stored if
                the check fails.
              </p>
            </form>

            <aside className={styles.sidePanel}>
              <h3 className={styles.sideTitle}>Point Meta at this webhook</h3>
              <p className={styles.sideBody}>
                In the Meta dashboard, under WhatsApp → Configuration, set the callback URL to the
                address below and subscribe to the <code>messages</code> field. Use the verify token
                from the server&apos;s <code>META_WEBHOOK_VERIFY_TOKEN</code>.
              </p>
              <WebhookUrl />
              <p className={styles.sideNote}>
                Instagram and Facebook Messenger are planned, not live. They are not offered here on
                purpose — WhatsApp comes first and has to be working properly before a second
                channel is worth the complexity.
              </p>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  hint: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.req}>*</span>}
      </span>
      <input
        name={name}
        type={type}
        className={styles.input}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        spellCheck={false}
      />
      <span className={styles.fieldHint}>{hint}</span>
    </label>
  );
}

/**
 * Hydration flag. False during SSR and the first client render, true after.
 * Preferred over a setState in an effect, which triggers a cascading render.
 */
const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The webhook URL, read from the browser rather than injected at build time —
 * it differs between localhost, a tunnel and production, and hard-coding it into
 * an env var is one more thing to get wrong during onboarding.
 */
function WebhookUrl() {
  const hydrated = useSyncExternalStore(NEVER_CHANGES, onClient, onServer);
  const [copied, setCopied] = useState(false);

  const url = hydrated ? `${window.location.origin}/api/webhooks/meta` : '';

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className={styles.webhookRow}>
      <code className={styles.webhookUrl}>{url || 'Loading…'}</code>
      <button
        type="button"
        className={styles.copyBtn}
        disabled={!url}
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true));
        }}
        aria-label="Copy webhook URL"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
