import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0A1628',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          H
        </span>
      </div>
    ),
    { ...size }
  );
}
