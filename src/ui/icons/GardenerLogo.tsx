import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const GardenerLogo: React.FC<LogoProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="goldLinear" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="40%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA771C" />
          <stop offset="100%" stopColor="#F5D061" />
        </linearGradient>
        <linearGradient id="brushAccent" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* YouTube Rounded Rect Base with metallic gold border */}
      <rect
        x="3"
        y="6"
        width="26"
        height="20"
        rx="5.5"
        fill="#0A0A0B"
        stroke="url(#goldLinear)"
        strokeWidth="1.75"
      />

      {/* YouTube Play Triangle */}
      <polygon
        points="13,11 21,16 13,21"
        fill="url(#goldLinear)"
      />

      {/* Diagonal Sweeper / Brush Stroke Accent */}
      <path
        d="M6 26 C 12 24, 18 10, 26 5"
        stroke="url(#brushAccent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="1 1.5"
        opacity="0.85"
      />

      {/* Bristle sparkles */}
      <circle cx="27" cy="4.5" r="1.5" fill="#FFF2B2" />
      <circle cx="24.5" cy="8.5" r="1" fill="#D4AF37" />
    </svg>
  );
};
