import type { MetadataRoute } from 'next';
import { PUBLIC } from '@/lib/routes';
import { marketingVerticals } from '@/lib/verticals';

/**
 * Only public pages belong here. Anything under /app is behind auth and would
 * be a crawl dead-end.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const staticPaths: Array<{ path: string; priority: number }> = [
    { path: PUBLIC.home, priority: 1 },
    { path: PUBLIC.pricing, priority: 0.9 },
    { path: PUBLIC.howItWorks, priority: 0.8 },
    { path: PUBLIC.demo, priority: 0.8 },
    { path: PUBLIC.setupService, priority: 0.8 },
    { path: PUBLIC.about, priority: 0.5 },
    { path: PUBLIC.contact, priority: 0.5 },
    { path: PUBLIC.privacy, priority: 0.3 },
    { path: PUBLIC.terms, priority: 0.3 },
  ];

  return [
    ...staticPaths.map(({ path, priority }) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority,
    })),
    ...marketingVerticals().map((vertical) => ({
      url: `${base}${PUBLIC.vertical(vertical.slug)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ];
}
