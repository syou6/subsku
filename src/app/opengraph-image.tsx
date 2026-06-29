import { ImageResponse } from 'next/og'

// Social share card (1200x630). Latin-only copy on purpose: next/og's default
// font does not cover Japanese, so JP text would render as tofu boxes.
export const alt = 'BURN — burn rate & runway for solo founders'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
          padding: '80px',
          background:
            'radial-gradient(120% 80% at 50% -10%, #5a2516 0%, #1d1510 45%, #13100e 100%)',
          color: '#f3ece3',
          fontFamily: 'sans-serif',
        }}
      >
        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1d140d" />
            <path
              d="M16 3c-4.5 5.5-8 9-8 15a8 8 0 0 0 16 0c0-4-2.2-6.5-4.2-9.4.2 2.6-.8 4-2.3 4.6C18.2 11 17 6.5 16 3z"
              fill="#f2a33c"
            />
            <path
              d="M16 15.5c-2.4 3-4 5-4 7.5a4 4 0 0 0 8 0c0-2.4-1.4-4.2-2.6-6 .1 1.4-.5 2.2-1.4 2.6.4-1.7 0-3.1 0-4.1z"
              fill="#fff4dd"
            />
          </svg>
          <div
            style={{
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: '#f8c879',
            }}
          >
            BURN
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '96px',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>How much are</span>
            <span style={{ display: 'flex' }}>
              you <span style={{ color: '#f2a33c', marginLeft: '0.28em' }}>burning?</span>
            </span>
          </div>
          <div style={{ fontSize: '34px', color: '#a99c8c', fontWeight: 500 }}>
            Burn rate · runway · break-even — for solo founders.
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '26px',
            color: '#6f6256',
          }}
        >
          <span>subsku.vercel.app</span>
          <span style={{ color: '#d9602e', fontWeight: 700 }}>Solo founder cost tracker</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
