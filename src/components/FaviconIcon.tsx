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
      className={`shrink-0 ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        {/* Contorno Perfil Lateral do Cérebro */}
        <path d="M 175 360 C 130 355 100 320 95 270 C 90 215 125 150 190 115 C 255 80 345 85 400 130 C 445 168 450 230 425 280 C 405 320 375 340 335 345" />
        <path d="M 335 345 C 375 350 405 370 395 405 C 385 435 345 440 315 420 C 295 408 290 380 305 350" />
        <path d="M 285 375 C 280 415 270 450 250 470" strokeWidth="18" />
        <path d="M 140 230 C 175 200 220 210 240 180 C 260 150 230 130 200 145" />
        <path d="M 210 120 C 250 140 290 125 320 150 C 350 175 320 210 280 200 C 240 190 230 230 260 250" />
        <path d="M 330 135 C 380 160 410 200 375 230 C 350 250 320 230 300 265" />
        <path d="M 115 250 C 150 260 180 245 205 270 C 230 295 210 325 180 330" />
        <path d="M 175 330 C 215 335 250 320 265 285 C 280 250 330 260 365 280" />
        <path d="M 265 285 C 245 270 205 280 185 260" />
        <path d="M 155 210 C 185 225 215 235 255 220" strokeWidth="12" opacity="0.9" />
        <path d="M 280 165 C 310 180 340 175 370 190" strokeWidth="12" opacity="0.9" />
        <path d="M 320 375 C 345 380 365 370 375 390" strokeWidth="12" opacity="0.9" />
      </g>
    </svg>
  );
};

export default FaviconIcon;
