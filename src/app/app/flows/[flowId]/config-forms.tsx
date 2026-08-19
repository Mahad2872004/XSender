'use client';

import { Plus, X } from 'lucide-react';
import type { NodeType } from '@/lib/schemas/flow';
import {
  BookingSlotsForm,
  CartReviewForm,
  CatalogBrowseForm,
  CreateBookingForm,
  CreateOrderForm,
  OrderStatusForm,
} from './commerce-forms';
import styles from './builder.module.css';

/**
 * Config editors, one per node type.
 *
 * `config` is an untyped bag here because it crosses the client boundary as
 * JSON; the server re-validates it against the node's zod schema on save, and
 * validateGraph() surfaces anything wrong before publishing. So these forms
 * optimise for being writable by a business owner, not for type ceremony.
 */

type Config = Record<string, unknown>;
type Props = { config: Config; onChange: (config: Config) => void };

export function NodeConfigForm({
  type,
  config,
  onChange,
}: Props & { type: NodeType }) {
  switch (type) {
    case 'send_message':
      return <SendMessageForm config={config} onChange={onChange} />;
    case 'ask_question':
      return <AskQuestionForm config={config} onChange={onChange} />;
    case 'condition':
      return <ConditionForm config={config} onChange={onChange} />;
    case 'set_variable':
      return <SetVariableForm config={config} onChange={onChange} />;
    case 'delay':
      return <DelayForm config={config} onChange={onChange} />;
    case 'handoff_to_human':
      return <HandoffForm config={config} onChange={onChange} />;
    case 'update_contact':
      return <UpdateContactForm config={config} onChange={onChange} />;
    case 'http_request':
      return <HttpRequestForm config={config} onChange={onChange} />;
    case 'catalog_browse':
      return <CatalogBrowseForm config={config} onChange={onChange} />;
    case 'cart_review':
      return <CartReviewForm config={config} onChange={onChange} />;
    case 'create_order':
      return <CreateOrderForm config={config} onChange={onChange} />;
    case 'order_status':
      return <OrderStatusForm config={config} onChange={onChange} />;
    case 'booking_slots':
      return <BookingSlotsForm config={config} onChange={onChange} />;
    case 'create_booking':
      return <CreateBookingForm config={config} onChange={onChange} />;
    case 'trigger':
      return (
        <p className={styles.staticNote}>
          This flow starts here whenever a customer messages you and no other flow is
          already running with them.
        </p>
      );
    case 'end':
      return <p className={styles.staticNote}>The conversation stops being automated here.</p>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Shared field primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

const VARIABLE_HINT = 'Use {{variable}} to drop in something collected earlier.';

// ---------------------------------------------------------------------------

function SendMessageForm({ config, onChange }: Props) {
  const body = (config.body ?? { kind: 'text', text: '' }) as Record<string, unknown>;
  const kind = String(body.kind ?? 'text');

  function setBody(patch: Config) {
    onChange({ ...config, body: { ...body, ...patch } });
  }

  return (
    <>
      <Field label="Message type">
        <select
          className={styles.select}
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            onChange({
              ...config,
              body:
                next === 'text'
                  ? { kind: 'text', text: '' }
                  : next === 'media'
                    ? { kind: 'media', mediaType: 'image', mediaUrl: '' }
                    : { kind: 'template', templateName: '', language: 'en', variables: {} },
            });
          }}
        >
          <option value="text">Text</option>
          <option value="media">Image or file</option>
          <option value="template">Approved template</option>
        </select>
      </Field>

      {kind === 'text' && (
        <Field label="What the customer sees" hint={VARIABLE_HINT}>
          <textarea
            className={styles.textarea}
            rows={5}
            value={String(body.text ?? '')}
            onChange={(e) => setBody({ text: e.target.value })}
          />
        </Field>
      )}

      {kind === 'media' && (
        <>
          <Field label="Type">
            <select
              className={styles.select}
              value={String(body.mediaType ?? 'image')}
              onChange={(e) => setBody({ mediaType: e.target.value })}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Document</option>
            </select>
          </Field>
          <Field label="File URL">
            <input
              className={styles.input}
              value={String(body.mediaUrl ?? '')}
              onChange={(e) => setBody({ mediaUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Caption" hint="Optional.">
            <input
              className={styles.input}
              value={String(body.caption ?? '')}
              onChange={(e) => setBody({ caption: e.target.value })}
            />
          </Field>
        </>
      )}

      {kind === 'template' && (
        <>
          <Field
            label="Template name"
            hint="Must be approved by Meta first. Templates are the only thing sendable more than 24 hours after the customer's last message."
          >
            <input
              className={styles.input}
              value={String(body.templateName ?? '')}
              onChange={(e) => setBody({ templateName: e.target.value })}
            />
          </Field>
          <Field label="Language">
            <input
              className={styles.input}
              value={String(body.language ?? 'en')}
              onChange={(e) => setBody({ language: e.target.value })}
            />
          </Field>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

type Option = { id: string; title: string; description?: string };

function AskQuestionForm({ config, onChange }: Props) {
  const expects = (config.expects ?? { kind: 'text' }) as Record<string, unknown>;
  const kind = String(expects.kind ?? 'text');

  const buttons = (expects.buttons ?? []) as Option[];
  const rows = (((expects.sections ?? []) as Array<{ rows?: Option[] }>)[0]?.rows ?? []) as Option[];

  function setExpects(next: Config) {
    onChange({ ...config, expects: next });
  }

  function setOptions(next: Option[]) {
    if (kind === 'buttons') setExpects({ kind: 'buttons', buttons: next });
    else setExpects({ kind: 'list', buttonLabel: expects.buttonLabel ?? 'Choose', sections: [{ rows: next }] });
  }

  const options = kind === 'buttons' ? buttons : rows;

  return (
    <>
      <Field label="What you ask" hint={VARIABLE_HINT}>
        <textarea
          className={styles.textarea}
          rows={4}
          value={String(config.prompt ?? '')}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
        />
      </Field>

      <Field
        label="Save the answer as"
        hint="Refer to it later with {{name}}. Letters, numbers and underscores only."
      >
        <input
          className={styles.input}
          value={String(config.saveAs ?? '')}
          onChange={(e) => onChange({ ...config, saveAs: e.target.value })}
          placeholder="party_size"
        />
      </Field>

      <Field label="Kind of answer">
        <select
          className={styles.select}
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            if (next === 'buttons') {
              setExpects({ kind: 'buttons', buttons: [{ id: 'yes', title: 'Yes' }] });
            } else if (next === 'list') {
              setExpects({
                kind: 'list',
                buttonLabel: 'Choose',
                sections: [{ rows: [{ id: 'option_1', title: 'Option 1' }] }],
              });
            } else {
              setExpects({ kind: next });
            }
          }}
        >
          <option value="text">Anything they type</option>
          <option value="buttons">Buttons (up to 3)</option>
          <option value="list">A list (up to 10)</option>
          <option value="number">A number</option>
          <option value="email">An email address</option>
          <option value="phone">A phone number</option>
          <option value="date">A date and time</option>
          <option value="location">A shared location</option>
        </select>
      </Field>

      {(kind === 'buttons' || kind === 'list') && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Options</span>
          <span className={styles.fieldHint}>
            Each option becomes its own exit on the canvas, so you can send people down
            different paths.
          </span>

          <div className={styles.optionList}>
            {options.map((option, index) => (
              <div key={index} className={styles.optionRow}>
                <input
                  className={styles.optionTitle}
                  value={option.title}
                  placeholder="What they see"
                  onChange={(e) => {
                    const next = [...options];
                    next[index] = { ...option, title: e.target.value };
                    setOptions(next);
                  }}
                />
                <input
                  className={styles.optionId}
                  value={option.id}
                  placeholder="id"
                  title="Used to name this branch. Changing it disconnects any edge already attached."
                  onChange={(e) => {
                    const next = [...options];
                    next[index] = { ...option, id: e.target.value };
                    setOptions(next);
                  }}
                />
                <button
                  type="button"
                  className={styles.optionRemove}
                  onClick={() => setOptions(options.filter((_, i) => i !== index))}
                  aria-label="Remove option"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {(kind === 'list' || options.length < 3) && (
            <button
              type="button"
              className={styles.addRowBtn}
              onClick={() =>
                setOptions([
                  ...options,
                  { id: `option_${options.length + 1}`, title: `Option ${options.length + 1}` },
                ])
              }
            >
              <Plus size={13} />
              Add option
            </button>
          )}
          {kind === 'buttons' && options.length >= 3 && (
            <span className={styles.fieldHint}>
              WhatsApp allows at most 3 buttons. Switch to a list for more.
            </span>
          )}
        </div>
      )}

      <Field
        label="Give up after"
        hint="If they keep replying with something unexpected, the flow takes the fallback exit."
      >
        <select
          className={styles.select}
          value={String(config.maxAttempts ?? 3)}
          onChange={(e) => onChange({ ...config, maxAttempts: Number(e.target.value) })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'try' : 'tries'}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------

function ConditionForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="Check this value" hint="The name you saved an answer as earlier.">
        <input
          className={styles.input}
          value={String(config.variable ?? '')}
          onChange={(e) => onChange({ ...config, variable: e.target.value })}
          placeholder="party_size"
        />
      </Field>

      <Field label="Test">
        <select
          className={styles.select}
          value={String(config.comparator ?? 'equals')}
          onChange={(e) => onChange({ ...config, comparator: e.target.value })}
        >
          <option value="equals">is exactly</option>
          <option value="not_equals">is not</option>
          <option value="contains">contains</option>
          <option value="greater_than">is more than</option>
          <option value="less_than">is less than</option>
          <option value="is_set">has been answered</option>
          <option value="is_empty">is empty</option>
        </select>
      </Field>

      {!['is_set', 'is_empty'].includes(String(config.comparator)) && (
        <Field label="Compared to">
          <input
            className={styles.input}
            value={String(config.value ?? '')}
            onChange={(e) => onChange({ ...config, value: e.target.value })}
          />
        </Field>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function SetVariableForm({ config, onChange }: Props) {
  const assignments = (config.assignments ?? []) as Array<{ name: string; value: string }>;

  function update(next: typeof assignments) {
    onChange({ ...config, assignments: next });
  }

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Values to set</span>
      <span className={styles.fieldHint}>{VARIABLE_HINT}</span>

      <div className={styles.optionList}>
        {assignments.map((assignment, index) => (
          <div key={index} className={styles.optionRow}>
            <input
              className={styles.optionId}
              value={assignment.name}
              placeholder="name"
              onChange={(e) => {
                const next = [...assignments];
                next[index] = { ...assignment, name: e.target.value };
                update(next);
              }}
            />
            <input
              className={styles.optionTitle}
              value={assignment.value}
              placeholder="value"
              onChange={(e) => {
                const next = [...assignments];
                next[index] = { ...assignment, value: e.target.value };
                update(next);
              }}
            />
            <button
              type="button"
              className={styles.optionRemove}
              onClick={() => update(assignments.filter((_, i) => i !== index))}
              aria-label="Remove"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.addRowBtn}
        onClick={() => update([...assignments, { name: '', value: '' }])}
      >
        <Plus size={13} />
        Add value
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DelayForm({ config, onChange }: Props) {
  return (
    <>
      <Field
        label="Wait for"
        hint="The conversation pauses here and picks up on its own. Used for nudges and reminders."
      >
        <div className={styles.inlineRow}>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={Number(config.duration ?? 15)}
            onChange={(e) => onChange({ ...config, duration: Number(e.target.value) })}
          />
          <select
            className={styles.select}
            value={String(config.unit ?? 'minutes')}
            onChange={(e) => onChange({ ...config, unit: e.target.value })}
          >
            <option value="seconds">seconds</option>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      </Field>

      <p className={styles.staticNote}>
        Note: on WhatsApp you can only send a free-form message within 24 hours of the
        customer&rsquo;s last message. After that, use an approved template.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------

function HandoffForm({ config, onChange }: Props) {
  const tags = (config.tags ?? []) as string[];

  return (
    <>
      <Field
        label="What the customer is told"
        hint="Leave blank to say nothing. Telling them a person is coming stops them repeating themselves."
      >
        <textarea
          className={styles.textarea}
          rows={3}
          value={String(config.message ?? '')}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
        />
      </Field>

      <Field label="Tags" hint="Comma separated. Used to route the conversation in your inbox.">
        <input
          className={styles.input}
          value={tags.join(', ')}
          onChange={(e) =>
            onChange({
              ...config,
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="needs-human, vip"
        />
      </Field>

      <Field label="Note for your team" hint="Optional. Only your staff see this.">
        <input
          className={styles.input}
          value={String(config.note ?? '')}
          onChange={(e) => onChange({ ...config, note: e.target.value })}
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------

function UpdateContactForm({ config, onChange }: Props) {
  const fields = (config.fields ?? []) as Array<{ field: string; value: string }>;
  const addTags = (config.addTags ?? []) as string[];

  return (
    <>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Save onto the customer record</span>
        <span className={styles.fieldHint}>
          Known fields (full_name, phone, email) update the contact. Anything else is stored
          as a custom attribute.
        </span>

        <div className={styles.optionList}>
          {fields.map((entry, index) => (
            <div key={index} className={styles.optionRow}>
              <input
                className={styles.optionId}
                value={entry.field}
                placeholder="full_name"
                onChange={(e) => {
                  const next = [...fields];
                  next[index] = { ...entry, field: e.target.value };
                  onChange({ ...config, fields: next });
                }}
              />
              <input
                className={styles.optionTitle}
                value={entry.value}
                placeholder="{{answer}}"
                onChange={(e) => {
                  const next = [...fields];
                  next[index] = { ...entry, value: e.target.value };
                  onChange({ ...config, fields: next });
                }}
              />
              <button
                type="button"
                className={styles.optionRemove}
                onClick={() => onChange({ ...config, fields: fields.filter((_, i) => i !== index) })}
                aria-label="Remove"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={styles.addRowBtn}
          onClick={() => onChange({ ...config, fields: [...fields, { field: '', value: '' }] })}
        >
          <Plus size={13} />
          Add field
        </button>
      </div>

      <Field label="Add tags" hint="Comma separated.">
        <input
          className={styles.input}
          value={addTags.join(', ')}
          onChange={(e) =>
            onChange({
              ...config,
              addTags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="lead, hot"
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------

function HttpRequestForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="Method">
        <select
          className={styles.select}
          value={String(config.method ?? 'POST')}
          onChange={(e) => onChange({ ...config, method: e.target.value })}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="URL" hint={VARIABLE_HINT}>
        <input
          className={styles.input}
          value={String(config.url ?? '')}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://example.com/hook"
        />
      </Field>

      <Field label="Body" hint="Sent as-is. Ignored for GET.">
        <textarea
          className={styles.textarea}
          rows={4}
          value={String(config.body ?? '')}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          placeholder='{"order": "{{item}}"}'
        />
      </Field>

      <Field label="Save the response as" hint="Optional.">
        <input
          className={styles.input}
          value={String(config.saveAs ?? '')}
          onChange={(e) => onChange({ ...config, saveAs: e.target.value })}
          placeholder="api_result"
        />
      </Field>

      <p className={styles.staticNote}>
        If the call fails the flow takes the <strong>error</strong> exit rather than
        stopping, so a customer is never left mid-conversation.
      </p>
    </>
  );
}
