import { ImageResponse } from 'next/og';
import { marketingVerticals, verticalBySlug } from '@/lib/verticals';

/**
 * Per-vertical social preview, so a link shared into a restaurant owners' group
 * says "restaurants" rather than something generic.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return marketingVerticals().map((v) => ({ vertical: v.slug }));
}

export const alt = 'xSender for your business';

export default async function VerticalOgImage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical: slug } = await params;
  const vertical = verticalBySlug(slug);
  const heading = vertical ? `Built for ${vertical.plural.toLowerCase()}` : 'Built for your business';
  const sub = vertical?.doingByHand ?? 'Stop answering the same messages by hand';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: '#07130F',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#04231a',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            x
          </div>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>
            xSender
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span
            style={{
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#10b981',
            }}
          >
            {heading}
          </span>
          <span style={{ fontSize: 30, color: '#a7f3d0', lineHeight: 1.4 }}>
            Stop {sub.charAt(0).toLowerCase() + sub.slice(1)}
          </span>
        </div>

        <span style={{ fontSize: 22, color: '#a7f3d0' }}>
          WhatsApp · Instagram · Messenger — one inbox, answered automatically
        </span>
      </div>
    ),
    size
  );
}
