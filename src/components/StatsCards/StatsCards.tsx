import React from 'react';
import { MessageSquare, Send, AlertTriangle, Target } from 'lucide-react';
import styles from './StatsCards.module.css';

export default function StatsCards() {
  return (
    <div className={styles.grid}>
      {/* Card 1 */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Total Conversations<br/>Today</span>
          <MessageSquare className={styles.icon} size={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.value}>1,234</span>
          <span className={styles.trend}>~+12%</span>
        </div>
        <div className={styles.chartPlaceholder}>
          <div className={styles.bar} style={{ height: '30%' }}></div>
          <div className={styles.bar} style={{ height: '40%' }}></div>
          <div className={styles.bar} style={{ height: '35%' }}></div>
          <div className={styles.bar} style={{ height: '60%' }}></div>
          <div className={styles.bar} style={{ height: '70%' }}></div>
          <div className={styles.bar} style={{ height: '100%' }}></div>
        </div>
      </div>

      {/* Card 2 */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Messages Sent</span>
          <Send className={styles.icon} size={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.value}>45,678</span>
        </div>
        <div className={styles.chartPlaceholder}>
          <div className={styles.bar} style={{ height: '50%' }}></div>
          <div className={styles.bar} style={{ height: '60%' }}></div>
          <div className={styles.bar} style={{ height: '55%' }}></div>
          <div className={styles.bar} style={{ height: '80%' }}></div>
          <div className={styles.bar} style={{ height: '70%' }}></div>
          <div className={styles.bar} style={{ height: '100%' }}></div>
        </div>
      </div>

      {/* Card 3 */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Open Tickets</span>
          <AlertTriangle className={styles.iconWarning} size={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.value} style={{ color: 'var(--status-red)' }}>23</span>
          <span className={`${styles.badge} ${styles.badgeWarning}`}>REQUIRES ACTION</span>
        </div>
        <div className={styles.footer}>
          <i>+5 since last hour</i>
        </div>
      </div>

      {/* Card 4 */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Campaign CTR</span>
          <Target className={styles.icon} size={20} />
        </div>
        <div className={styles.content} style={{ justifyContent: 'space-between' }}>
          <div>
            <span className={styles.value}>18.5%</span>
            <div className={styles.footer} style={{ marginTop: '8px' }}>
              <i>Benchmark: 15%</i>
            </div>
          </div>
          <div className={styles.circularChart}></div>
        </div>
      </div>
    </div>
  );
}
