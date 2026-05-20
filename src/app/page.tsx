import React from 'react';
import StatsCards from '@/components/StatsCards/StatsCards';
import RecentConversations from '@/components/RecentConversations/RecentConversations';
import CampaignPerformance from '@/components/CampaignPerformance/CampaignPerformance';
import QuickActions from '@/components/QuickActions/QuickActions';
import PendingApprovals from '@/components/PendingApprovals/PendingApprovals';
import AgentLeaderboard from '@/components/AgentLeaderboard/AgentLeaderboard';
import FloatingActionButton from '@/components/FloatingActionButton/FloatingActionButton';
import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <StatsCards />
      
      <div className={styles.middleRow}>
        <RecentConversations />
        <CampaignPerformance />
      </div>

      <div className={styles.bottomRow}>
        <QuickActions />
        <PendingApprovals />
        <AgentLeaderboard />
      </div>

      <FloatingActionButton />
    </div>
  );
}
