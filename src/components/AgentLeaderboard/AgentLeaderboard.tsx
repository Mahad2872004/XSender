import React from 'react';
import styles from './AgentLeaderboard.module.css';

const agents = [
  {
    id: 1,
    name: 'Alex Martinez',
    avatar: 'https://i.pravatar.cc/150?u=alex',
    handled: 142,
    avg: '1m avg',
    status: 'online',
  },
  {
    id: 2,
    name: 'Emily Rhodes',
    avatar: 'https://i.pravatar.cc/150?u=emily',
    handled: 128,
    avg: '3m avg',
    status: 'online',
  },
  {
    id: 3,
    name: 'James Wilson',
    avatar: 'https://i.pravatar.cc/150?u=james',
    handled: 95,
    avg: '5m avg',
    status: 'away',
  },
];

export default function AgentLeaderboard() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Agent Leaderboard</h2>
      
      <div className={styles.list}>
        {agents.map((agent, index) => (
          <div key={agent.id} className={styles.item}>
            <div className={styles.agentInfo}>
              <div className={styles.avatarContainer}>
                <img src={agent.avatar} alt={agent.name} className={styles.avatar} />
                <span 
                  className={`${styles.statusDot} ${agent.status === 'online' ? styles.statusOnline : styles.statusAway}`}
                ></span>
              </div>
              <div className={styles.details}>
                <span className={styles.name}>{agent.name}</span>
                <span className={styles.stats}>{agent.handled} handled • {agent.avg}</span>
              </div>
            </div>
            <span className={`${styles.rank} ${index === 0 ? styles.rankTop : styles.rankNormal}`}>
              #{index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
