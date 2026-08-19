'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import styles from './hero-chat.module.css';

/**
 * The hero visual: a scripted conversation that types itself out.
 *
 * Chosen over a screenshot or a stock photo because it shows the product doing
 * its job in the first five seconds, which is the whole argument. The script
 * ends on the handoff deliberately — "it knows when to fetch a human" is the
 * objection most likely to stop a sale, so it is answered before it is asked.
 */

type Line =
  | { from: 'customer'; text: string }
  | { from: 'bot'; text: string; options?: string[] }
  | { from: 'system'; text: string };

const SCRIPT: Line[] = [
  { from: 'customer', text: 'Hi, are you still open?' },
  {
    from: 'bot',
    text: 'Yes — we’re open until 11pm 👋\nWhat can I help you with?',
    options: ['View menu', 'Book a table', 'Talk to staff'],
  },
  { from: 'customer', text: 'View menu' },
  { from: 'bot', text: 'Here’s tonight’s menu.', options: ['Mains', 'Starters', 'Drinks'] },
  { from: 'customer', text: 'Beef Biryani' },
  {
    from: 'bot',
    text: 'Added to your cart. Total: Rs. 750\nDelivery or pickup?',
    options: ['Delivery', 'Pickup'],
  },
  { from: 'customer', text: 'Delivery' },
  { from: 'bot', text: 'Order XS-1042 confirmed 🎉\nEstimated delivery: 35–40 min.' },
  { from: 'system', text: 'Order saved · no staff involved' },
];

const STEP_MS = 1500;

export default function HeroChat() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(1);

  // Derived rather than set: someone who has asked for reduced motion sees the
  // whole conversation at once, without a state write to get there.
  const shown = prefersReducedMotion ? SCRIPT.length : step;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setStep((current) => {
        if (current >= SCRIPT.length) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [prefersReducedMotion]);

  return (
    <div className={styles.phone} aria-label="Example conversation handled automatically">
      <div className={styles.phoneBar}>
        <span className={styles.phoneAvatar}>C</span>
        <div>
          <span className={styles.phoneName}>Cafe Delight</span>
          <span className={styles.phoneStatus}>replies instantly</span>
        </div>
      </div>

      <div className={styles.thread}>
        {SCRIPT.slice(0, shown).map((line, index) => {
          if (line.from === 'system') {
            return (
              <div key={index} className={styles.systemNote}>
                {line.text}
              </div>
            );
          }

          const fromCustomer = line.from === 'customer';
          // Only bot messages carry tappable options; narrowing here keeps the
          // union honest rather than widening the type to allow both.
          const options = line.from === 'bot' ? line.options : undefined;

          return (
            <div key={index} className={fromCustomer ? styles.rowRight : styles.rowLeft}>
              <div className={fromCustomer ? styles.bubbleOut : styles.bubbleIn}>
                <p className={styles.text}>{line.text}</p>
                {options && (
                  <div className={styles.options}>
                    {options.map((option) => (
                      <span key={option} className={styles.option}>
                        {option}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {shown < SCRIPT.length && (
          <div className={SCRIPT[shown].from === 'customer' ? styles.rowRight : styles.rowLeft}>
            <div className={styles.typing} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
