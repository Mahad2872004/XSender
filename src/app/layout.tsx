import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import Topbar from '@/components/Topbar/Topbar';

export const metadata: Metadata = {
  title: 'Xsender Dashboard',
  description: 'A modern messaging and order dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Topbar />
            <main style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px 32px' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
