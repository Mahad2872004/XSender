import React from 'react';
import { Megaphone, FileText, UserPlus, Workflow } from 'lucide-react';
import styles from './QuickActions.module.css';

export default function QuickActions() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Quick Actions</h2>
      <div className={styles.grid}>
        <button className={styles.actionButton}>
          <div className={`${styles.iconWrapper} ${styles.iconWrapperActive}`}>
            <Megaphone size={20} />
          </div>
          <span className={styles.actionText}>Send Broadcast</span>
        </button>
        
        <button className={styles.actionButton}>
          <div className={styles.iconWrapper}>
            <FileText size={20} />
          </div>
          <span className={styles.actionText}>Create<br/>Template</span>
        </button>

        <button className={styles.actionButton}>
          <div className={styles.iconWrapper}>
            <UserPlus size={20} />
          </div>
          <span className={styles.actionText}>Add Contact</span>
        </button>

        <button className={styles.actionButton}>
          <div className={styles.iconWrapper}>
            <Workflow size={20} />
          </div>
          <span className={styles.actionText}>New Flow</span>
        </button>
      </div>
    </div>
  );
}
