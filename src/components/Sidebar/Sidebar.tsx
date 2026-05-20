'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  Contact2, 
  Megaphone, 
  Bot, 
  LibrarySquare, 
  ShoppingCart, 
  Banknote, 
  BarChart2, 
  MessageSquare, 
  Users, 
  Blocks, 
  Receipt, 
  Settings,
  Send
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Inbox', icon: Inbox, href: '/inbox' },
  { name: 'Contacts', icon: Contact2, href: '/contacts' },
  { name: 'Campaigns', icon: Megaphone, href: '/campaigns' },
  { name: 'Automation', icon: Bot, href: '/automation' },
  { name: 'Catalog', icon: LibrarySquare, href: '/catalog' },
  { name: 'Orders', icon: ShoppingCart, href: '/orders' },
  { name: 'Payments', icon: Banknote, href: '/payments' },
  { name: 'Reports', icon: BarChart2, href: '/reports' },
  { name: 'Conversations', icon: MessageSquare, href: '/conversations' },
  { name: 'Team', icon: Users, href: '/team' },
  { name: 'Integrations', icon: Blocks, href: '/integrations' },
  { name: 'Billing', icon: Receipt, href: '/billing' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Send className={styles.logoIcon} size={28} />
        <span>Xsender</span>
      </div>
      
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon className={styles.navIcon} size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.settings}>
        <Link 
          href="/settings" 
          className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}
        >
          <Settings className={styles.navIcon} size={20} />
          Settings
        </Link>
      </div>

      <div className={styles.userProfile}>
        <img src="https://i.pravatar.cc/150?u=alexr" alt="Alex Rivera" className={styles.userAvatar} />
        <div className={styles.userInfo}>
          <span className={styles.userName}>Alex Rivera</span>
          <span className={styles.userRole}>Admin</span>
        </div>
      </div>
    </aside>
  );
}
