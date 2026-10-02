import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  isDark?: boolean;
}

export const GardenerLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 28,
  isDark = true
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* YouTube Rounded Rect Base (YouTube Red) */}
      <rect
        x="3"
        y="6"
        width="26"
        height="20"
        rx="5.5"
        fill="#FF0000"
      />

      {/* YouTube White Play Triangle */}
      <polygon
        points="13,11 21,16 13,21"
        fill="#FFFFFF"
      />

      {/* Diagonal Sweeper / Brush Stroke Accent */}
      <path
        d="M6 25 C 13 23, 19 11, 26 5.5"
        stroke={isDark ? '#FFFFFF' : '#0F0F0F'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="1.5 2"
        opacity="0.9"
      />

      {/* Clean sparkles / bristles */}
      <circle cx="26.5" cy="5" r="1.5" fill={isDark ? '#FFFFFF' : '#0F0F0F'} />
      <circle cx="23.5" cy="9" r="1" fill={isDark ? '#FFFFFF' : '#0F0F0F'} />
    </svg>
  );
};
