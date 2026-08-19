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
import { APP } from '@/lib/routes';
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
    items: [{ name: 'Dashboard', icon: LayoutDashboard, href: APP.dashboard }],
  },
  {
    label: 'Conversations',
    items: [
      { name: 'Inbox', icon: Inbox, href: APP.inbox },
      { name: 'Contacts', icon: Contact2, href: APP.contacts },
    ],
  },
  {
    label: 'Automation',
    items: [
      { name: 'Flows', icon: Workflow, href: APP.flows },
      { name: 'Simulator', icon: MonitorPlay, href: APP.simulator },
      { name: 'Campaigns', icon: Megaphone, href: APP.campaigns },
      { name: 'Templates', icon: FileCheck2, href: APP.templates },
    ],
  },
  {
    label: 'Business',
    items: [
      { name: 'Menu & Services', icon: UtensilsCrossed, href: APP.menu },
      { name: 'Orders', icon: ShoppingCart, href: APP.orders },
      { name: 'Bookings', icon: CalendarClock, href: APP.bookings },
      { name: 'Payments', icon: Banknote, href: APP.payments },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Reports', icon: BarChart2, href: APP.reports },
      { name: 'Billing', icon: Receipt, href: APP.billing },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  // The dashboard sits at the root of /app, so a prefix match would light it up
  // on every page underneath it.
  if (href === APP.dashboard) return pathname === APP.dashboard;
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
          href={APP.settings}
          className={`${styles.navItem} ${
            isActive(pathname, APP.settings) ? styles.active : ''
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
