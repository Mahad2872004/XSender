'use client';

import { useEffect, useState } from 'react';
import { Check, Download, Link2, Printer } from 'lucide-react';
import styles from './report.module.css';

/**
 * Sharing the report.
 *
 * Print-to-PDF rather than server-side PDF generation: every browser already
 * does it, the output is the page the owner just read, and it adds no dependency
 * to the one screen that has to keep working.
 */
export default function ReportActions({ csv, filename }: { csv: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.action} onClick={() => window.print()}>
        <Printer size={14} />
        Print or save as PDF
      </button>

      <button type="button" className={styles.action} onClick={downloadCsv}>
        <Download size={14} />
        Daily figures (CSV)
      </button>

      <button
        type="button"
        className={styles.action}
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
        }}
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
