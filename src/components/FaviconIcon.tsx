import React from 'react';

interface FaviconIconProps {
  size?: number;
  className?: string;
}

export const FaviconIcon: React.FC<FaviconIconProps> = ({ size = 24, className = '' }) => {
  return (
    <img
      src="/favicon.png"
      alt="Conscientemente"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
};

export default FaviconIcon;


