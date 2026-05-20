import React from 'react';
import Link from 'next/link';
import styles from './RecentConversations.module.css';

const conversations = [
  {
    id: 1,
    customer: {
      name: 'Sarah Jenkins',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
    },
    platform: 'WhatsApp',
    lastMessage: 'I need help with my rece...',
    status: 'OPEN',
    agent: 'Alex M.',
  },
  {
    id: 2,
    customer: {
      name: 'Robert King',
      initials: 'RK',
    },
    platform: 'WhatsApp',
    lastMessage: 'Thank you for the quick ...',
    status: 'RESOLVED',
    agent: 'System',
  },
  {
    id: 3,
    customer: {
      name: 'Marc Stevens',
      avatar: 'https://i.pravatar.cc/150?u=marc',
    },
    platform: 'WhatsApp',
    lastMessage: 'When will the new stock ...',
    status: 'PENDING',
    agent: 'Emily R.',
  },
];

export default function RecentConversations() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Recent Conversations</h2>
        <Link href="/conversations" className={styles.viewAll}>View All</Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>CUSTOMER</th>
            <th className={styles.th}>LAST MESSAGE</th>
            <th className={styles.th}>STATUS</th>
            <th className={styles.th}>AGENT</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conv) => (
            <tr key={conv.id} className={styles.tr}>
              <td className={styles.td}>
                <div className={styles.customer}>
                  {conv.customer.avatar ? (
                    <img src={conv.customer.avatar} alt={conv.customer.name} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatar}>{conv.customer.initials}</div>
                  )}
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>{conv.customer.name}</span>
                    <span className={styles.platformBadge}>{conv.platform}</span>
                  </div>
                </div>
              </td>
              <td className={styles.td}>
                <div className={styles.message}>{conv.lastMessage}</div>
              </td>
              <td className={styles.td}>
                <span className={`${styles.status} ${
                  conv.status === 'OPEN' ? styles.statusOpen : 
                  conv.status === 'RESOLVED' ? styles.statusResolved : 
                  styles.statusPending
                }`}>
                  {conv.status}
                </span>
              </td>
              <td className={styles.td}>
                <span className={styles.agent}>{conv.agent}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
