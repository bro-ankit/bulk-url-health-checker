import { ImageResponse } from 'next/og';

const SIZE = { width: 32, height: 32 };

const Icon = () => {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 6 9 17l-5-5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    SIZE,
  );
};

export default Icon;
