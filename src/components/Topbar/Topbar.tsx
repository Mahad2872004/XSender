'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, HelpCircle } from 'lucide-react';
import styles from './Topbar.module.css';

export default function Topbar() {
  const pathname = usePathname();
  
  let title = 'Dashboard';
  if (pathname.startsWith('/inbox')) title = 'Unified Inbox';
  else if (pathname.startsWith('/contacts')) title = 'Contacts';
  else if (pathname.startsWith('/campaigns')) title = 'Campaigns';
  else if (pathname.startsWith('/automation')) title = 'Automation';
  else if (pathname.startsWith('/catalog')) title = 'Message Templates';
  else if (pathname.startsWith('/reports')) title = 'Analytics';
  else if (pathname.startsWith('/orders')) title = 'Orders';
  else if (pathname.startsWith('/payments')) title = 'Payments';
  else if (pathname.startsWith('/conversations')) title = 'Conversations';
  else if (pathname.startsWith('/team')) title = 'Team';
  else if (pathname.startsWith('/integrations')) title = 'Integrations';
  else if (pathname.startsWith('/billing')) title = 'Billing & Usage';
  else if (pathname.startsWith('/settings')) title = 'Settings';

  let isCampaigns = pathname.startsWith('/campaigns');
  let isAutomationFlow = pathname === '/automation';
  let isAutomationAgents = pathname.startsWith('/automation/agents');
  
  let placeholder = 'Search...';
  if (pathname.startsWith('/inbox')) placeholder = 'Search conversations...';
  else if (pathname.startsWith('/contacts')) placeholder = 'Search leads...';
  else if (pathname.startsWith('/catalog')) placeholder = 'Search templates...';
  else if (pathname.startsWith('/reports')) placeholder = 'Search insights...';
  else if (isCampaigns) placeholder = 'Search templates, audiences...';
  else if (isAutomationAgents) placeholder = 'Search AI tools...';
  else if (pathname === '/') placeholder = 'Search conversations...';

  if (isAutomationFlow) {
    return (
      <header className={styles.topbar}>
        <div className={styles.botInfo}>
          <div className={styles.botIconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className={styles.botText}>
            <h1 className={styles.botTitle}>Welcome Bot - v1.2</h1>
            <span className={styles.botDraft}>DRAFT - UPDATED 2M AGO</span>
          </div>
        </div>

        <div className={styles.automationActions}>
          <div className={styles.zoomControls}>
            <button className={styles.controlBtn}>↶</button>
            <button className={styles.controlBtn}>↷</button>
            <div className={styles.divider}></div>
            <button className={styles.controlBtn}>-</button>
            <span className={styles.zoomText}>85%</span>
            <button className={styles.controlBtn}>+</button>
          </div>

          <Link href="/automation/agents" className={styles.btnSave} style={{ textDecoration: 'none' }}>
            🤖 AI Agents
          </Link>
          <button className={styles.btnSave}>Save Draft</button>
          <button className={styles.btnTest}>▶ Test Flow</button>
          
          <div className={styles.publishToggle}>
            <span className={styles.publishLabel}>PUBLISH</span>
            <div className={styles.toggleBg}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={styles.topbar}>
      {!isCampaigns && !isAutomationAgents && <h1 className={styles.title}>{title}</h1>}
      
      {isAutomationAgents && (
        <div className={styles.searchContainer} style={{ width: '400px' }}>
          <Search className={styles.searchIcon} size={18} />
          <input 
            type="text" 
            placeholder={placeholder}
            className={styles.searchInput}
            style={{ backgroundColor: '#f1f5f9' }}
          />
        </div>
      )}

      <div className={`${styles.rightSection} ${isCampaigns ? styles.campaignsLayout : ''}`} style={isAutomationAgents ? { flex: 1, justifyContent: 'flex-end' } : {}}>
        
        {!isAutomationAgents && !pathname.startsWith('/settings') && !pathname.startsWith('/billing') && (
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text" 
              placeholder={placeholder}
              className={styles.searchInput}
            />
          </div>
        )}

        {isAutomationAgents && (
          <h1 className={styles.title} style={{ fontSize: '16px', marginRight: '8px' }}>AI Agent Settings</h1>
        )}

        <div className={styles.actions}>
          <button className={styles.iconButton} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className={styles.iconButton} aria-label="Help">
            <HelpCircle size={20} />
          </button>
          {!isCampaigns && (
            <div className={styles.profile}>
              {!pathname.startsWith('/settings') && (
                <div className={styles.profileInfo}>
                  <span className={styles.profileName}>Admin Panel</span>
                  <span className={styles.profilePlan}>Premium Plan</span>
                </div>
              )}
              <img 
                src="https://i.pravatar.cc/150?u=xsender" 
                alt="User profile" 
                className={styles.avatar} 
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
