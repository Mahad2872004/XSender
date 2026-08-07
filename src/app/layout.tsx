import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'xSender',
  description: 'Automate the manual chat, order, and booking work your team does by hand.',
};

/**
 * Root layout holds only the document shell. The dashboard chrome lives in
 * (app)/layout.tsx so the auth screens can render without a sidebar.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
