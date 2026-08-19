import { ImageResponse } from 'next/og';

/**
 * Social preview for the marketing pages.
 *
 * Generated at build time rather than designed in a graphics tool so it never
 * drifts from the positioning, and so vertical pages can vary the text without
 * anyone exporting a new PNG.
 */

export const alt = 'xSender — automate WhatsApp, Instagram and Facebook messages';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Your customers message at midnight.</span>
            <span style={{ color: '#10b981' }}>Your staff don&apos;t.</span>
          </div>

          <span style={{ fontSize: 28, color: '#a7f3d0', lineHeight: 1.4 }}>
            Automate WhatsApp, Instagram and Messenger — orders, bookings, and a
            handover to a person when it matters.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: 22, color: '#a7f3d0' }}>
          <span>Official Meta Cloud API</span>
          <span>·</span>
          <span>Keep your number</span>
          <span>·</span>
          <span>Live in a day</span>
        </div>
      </div>
    ),
    size
  );
}
