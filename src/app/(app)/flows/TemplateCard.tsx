'use client';

import { useTransition } from 'react';
import { Clock, Plus, Star } from 'lucide-react';
import { installTemplate } from './actions';
import styles from './flows.module.css';

export default function TemplateCard({
  id,
  name,
  tagline,
  description,
  replaces,
  recommended,
}: {
  id: string;
  name: string;
  tagline: string;
  description: string;
  replaces: string;
  recommended: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <article className={`${styles.templateCard} ${recommended ? styles.recommended : ''}`}>
      {recommended && (
        <span className={styles.recommendBadge}>
          <Star size={10} fill="currentColor" />
          For your business
        </span>
      )}

      <h3 className={styles.templateName}>{name}</h3>
      <p className={styles.templateTagline}>{tagline}</p>
      <p className={styles.templateDescription}>{description}</p>

      {/* The ROI line — what the business stops paying someone to do. */}
      <p className={styles.templateReplaces}>
        <Clock size={13} className={styles.replacesIcon} />
        <span>
          <strong>Replaces:</strong> {replaces}
        </span>
      </p>

      <button
        type="button"
        className={styles.installBtn}
        disabled={pending}
        onClick={() => startTransition(() => void installTemplate(id))}
      >
        <Plus size={15} />
        {pending ? 'Installing…' : 'Use this template'}
      </button>
    </article>
  );
}
