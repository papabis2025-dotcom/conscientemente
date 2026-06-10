import React from 'react';

interface PercentBookIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const PercentBookIcon = React.forwardRef<SVGSVGElement, PercentBookIconProps>(
  ({ size = 20, stroke = 'currentColor', strokeWidth = 2, fill = 'none', className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Book outline */}
      <path d="M4 3h13a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      {/* Spine */}
      <line x1="9" y1="3" x2="9" y2="19" />
      {/* Percent symbol diagonal line on right portion */}
      <line x1="12" y1="8.5" x2="16.5" y2="15.5" strokeWidth={1.8} />
      {/* Top-left dot of percent */}
      <circle cx="12.3" cy="8.8" r="1" fill="currentColor" stroke="none" />
      {/* Bottom-right dot of percent */}
      <circle cx="16.2" cy="15.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
);

PercentBookIcon.displayName = 'PercentBookIcon';
