import { ImageResponse } from 'next/og';

export const alt = 'H1B Salary Database — Search millions of H1B salary records';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#1d4ed8',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#bfdbfe' }}>
          H1BData.us
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#ffffff', marginTop: 24, lineHeight: 1.1 }}>
          H1B Salary Database
        </div>
        <div style={{ display: 'flex', fontSize: 36, color: '#dbeafe', marginTop: 24 }}>
          Search millions of H1B salary records from the US Dept. of Labor
        </div>
      </div>
    ),
    { ...size },
  );
}
