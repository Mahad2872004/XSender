'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, HelpCircle, ChevronLeft } from 'lucide-react';
import { APP } from '@/lib/routes';
import WorkspaceSwitcher, { type WorkspaceOption } from './WorkspaceSwitcher';
import styles from './Topbar.module.css';

/**
 * Page title and search placeholder per route. Kept as data rather than a
 * chain of if-statements so adding a screen is a one-line change.
 */
const ROUTES: Array<{ prefix: string; title: string; placeholder?: string }> = [
  { prefix: APP.inbox, title: 'Unified Inbox', placeholder: 'Search conversations…' },
  { prefix: APP.contacts, title: 'Contacts', placeholder: 'Search contacts…' },
  { prefix: APP.flows, title: 'Flows', placeholder: 'Search flows and templates…' },
  { prefix: APP.simulator, title: 'Simulator' },
  { prefix: APP.campaigns, title: 'Campaigns', placeholder: 'Search templates, audiences…' },
  { prefix: APP.templates, title: 'Message Templates', placeholder: 'Search templates…' },
  { prefix: APP.menu, title: 'Menu & Services', placeholder: 'Search items…' },
  { prefix: APP.orders, title: 'Orders', placeholder: 'Search orders…' },
  { prefix: APP.bookings, title: 'Bookings' },
  { prefix: APP.payments, title: 'Payments' },
  { prefix: APP.reports, title: 'Analytics', placeholder: 'Search insights…' },
  { prefix: APP.billing, title: 'Billing & Usage' },
  { prefix: APP.settings, title: 'Settings' },
  { prefix: APP.welcome, title: 'Set up' },
];

function routeFor(pathname: string) {
  return ROUTES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
}

export default function Topbar({
  workspace,
  workspaces,
}: {
  workspace: WorkspaceOption;
  workspaces: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const route = routeFor(pathname);

  const title = route?.title ?? 'Dashboard';
  const placeholder =
    route?.placeholder ??
    (pathname === APP.dashboard ? 'Search conversations…' : undefined);

  // The builder brings its own toolbar — flow name, save state, publish — so
  // the global bar just gets out of its way.
  const isBuilder = new RegExp(`^${APP.flows}/[^/]+$`).test(pathname);

  if (isBuilder) {
    return (
      <header className={styles.topbar}>
        <Link href={APP.flows} className={styles.backLink}>
          <ChevronLeft size={16} />
          All flows
        </Link>
        <div className={styles.rightSection}>
          <WorkspaceSwitcher active={workspace} options={workspaces} />
        </div>
      </header>
    );
  }

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.rightSection}>
        {placeholder && (
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} size={18} />
            <input type="text" placeholder={placeholder} className={styles.searchInput} />
          </div>
        )}

        <WorkspaceSwitcher active={workspace} options={workspaces} />

        <div className={styles.actions}>
          <button className={styles.iconButton} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className={styles.iconButton} aria-label="Help">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
