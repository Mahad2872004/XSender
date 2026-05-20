import React from 'react';
import styles from './PendingApprovals.module.css';

const approvals = [
  {
    id: 1,
    name: 'welcome_discount_v1',
    category: 'Marketing',
    time: '2h ago',
    status: 'UNDER REVIEW',
  },
  {
    id: 2,
    name: 'shipping_update_new',
    category: 'Utility',
    time: '5h ago',
    status: 'UNDER REVIEW',
  },
  {
    id: 3,
    name: 'abandoned_cart_msg',
    category: 'Marketing',
    time: '1d ago',
    status: 'APPROVED',
  },
];

export default function PendingApprovals() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Pending Approvals</h2>
      
      <div className={styles.list}>
        {approvals.map((app) => (
          <div 
            key={app.id} 
            className={`${styles.item} ${app.status === 'APPROVED' ? styles.itemSuccess : styles.itemWarning}`}
          >
            <div className={styles.info}>
              <span className={styles.itemName}>{app.name}</span>
              <span className={styles.itemMeta}>{app.category} • {app.time}</span>
            </div>
            <span 
              className={`${styles.badge} ${app.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeWarning}`}
            >
              {app.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
