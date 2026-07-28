import React from 'react';

interface FaviconIconProps {
  size?: number;
  className?: string;
}

export const FaviconIcon: React.FC<FaviconIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`rounded-xl shrink-0 ${className}`}
    >
      <rect width="512" height="512" rx="112" ry="112" fill="#09090b"/>
      <g fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 236 128 C 190 120 128 144 116 200 C 104 250 120 286 148 308 C 144 336 160 368 200 376 C 220 380 236 360 236 330 Z" />
        <path d="M 196 172 C 160 176 150 216 176 236 C 196 250 220 234 230 200" />
        <path d="M 148 260 C 130 280 152 320 188 314 C 210 310 224 286 216 260" />

        <path d="M 276 128 C 322 120 384 144 396 200 C 408 250 392 286 364 308 C 368 336 352 368 312 376 C 292 380 276 360 276 330 Z" />
        <path d="M 316 172 C 352 176 362 216 336 236 C 316 250 292 234 282 200" />
        <path d="M 364 260 C 382 280 360 320 324 314 C 302 310 288 286 296 260" />

        <path d="M 256 120 L 256 380" stroke="#ffffff" strokeWidth="14" strokeDasharray="14 10" opacity="0.85" />
        <path d="M 236 376 C 236 410 246 430 256 430 C 266 430 276 410 276 376" strokeWidth="14" />
      </g>
    </svg>
  );
};

export default FaviconIcon;
