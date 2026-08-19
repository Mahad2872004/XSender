import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The product, the auth screens and the machine-to-machine routes have
      // nothing to offer a crawler and would only waste crawl budget.
      disallow: ['/app/', '/api/', '/login', '/signup', '/onboarding', '/auth/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
