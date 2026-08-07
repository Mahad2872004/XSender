'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Contact2,
  Megaphone,
  Workflow,
  UtensilsCrossed,
  ShoppingCart,
  CalendarClock,
  FileCheck2,
  Banknote,
  BarChart2,
  Receipt,
  Settings,
  Send,
  MonitorPlay,
} from 'lucide-react';
import UserMenu, { type SidebarProfile } from './UserMenu';
import styles from './Sidebar.module.css';

export type { SidebarProfile };

/**
 * Navigation grouped by what the user is actually doing, rather than one flat
 * list. Two changes from the original build, both from the frontend audit:
 * "Catalog" is renamed to Templates (it is WhatsApp template compliance, not a
 * product list), and Team/Integrations are gone because both already live as
 * sections inside Settings.
 */
const NAV_GROUPS = [
  {
    label: null,
    items: [{ name: 'Dashboard', icon: LayoutDashboard, href: '/' }],
  },
  {
    label: 'Conversations',
    items: [
      { name: 'Inbox', icon: Inbox, href: '/inbox' },
      { name: 'Contacts', icon: Contact2, href: '/contacts' },
    ],
  },
  {
    label: 'Automation',
    items: [
      { name: 'Flows', icon: Workflow, href: '/flows' },
      { name: 'Simulator', icon: MonitorPlay, href: '/simulator' },
      { name: 'Campaigns', icon: Megaphone, href: '/campaigns' },
      { name: 'Templates', icon: FileCheck2, href: '/templates' },
    ],
  },
  {
    label: 'Business',
    items: [
      { name: 'Menu & Services', icon: UtensilsCrossed, href: '/menu' },
      { name: 'Orders', icon: ShoppingCart, href: '/orders' },
      { name: 'Bookings', icon: CalendarClock, href: '/bookings' },
      { name: 'Payments', icon: Banknote, href: '/payments' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Reports', icon: BarChart2, href: '/reports' },
      { name: 'Billing', icon: Receipt, href: '/billing' },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ profile }: { profile: SidebarProfile }) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Send className={styles.logoIcon} size={28} />
        <span>xSender</span>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className={styles.navGroup}>
            {group.label && <span className={styles.navGroupLabel}>{group.label}</span>}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive(pathname, item.href) ? styles.active : ''
                  }`}
                >
                  <Icon className={styles.navIcon} size={20} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.settings}>
        <Link
          href="/settings"
          className={`${styles.navItem} ${
            isActive(pathname, '/settings') ? styles.active : ''
          }`}
        >
          <Settings className={styles.navIcon} size={20} />
          Settings
        </Link>
      </div>

      <UserMenu profile={profile} />
    </aside>
  );
}
