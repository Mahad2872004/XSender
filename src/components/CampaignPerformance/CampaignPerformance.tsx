import React from 'react';
import { TrendingUp } from 'lucide-react';
import styles from './CampaignPerformance.module.css';

const campaigns = [
  { name: 'Summer Flash Sale', progress: 92, color: 'var(--sidebar-bg)' },
  { name: 'Loyalty Rewards Oct', progress: 74, color: 'var(--status-green)' },
  { name: 'Re-engagement Bot', progress: 48, color: 'var(--status-yellow)' },
  { name: 'Product Launch V2', progress: 31, color: 'var(--status-red)' },
  { name: 'Newsletter Blast', progress: 85, color: 'var(--sidebar-bg)' },
];

export default function CampaignPerformance() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Campaign Performance</h2>
      
      <div className={styles.list}>
        {campaigns.map((camp) => (
          <div key={camp.name} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemName}>{camp.name}</span>
              <span className={styles.itemValue}>{camp.progress}%</span>
            </div>
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBar} 
                style={{ 
                  width: `${camp.progress}%`,
                  backgroundColor: camp.color
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.insightCard}>
        <TrendingUp className={styles.insightIcon} size={16} />
        <div className={styles.insightContent}>
          <span className={styles.insightTitle}>QUICK INSIGHT</span>
          <span className={styles.insightText}>
            Top-performing campaigns use video templates 3x more.
          </span>
        </div>
      </div>
    </div>
  );
}
