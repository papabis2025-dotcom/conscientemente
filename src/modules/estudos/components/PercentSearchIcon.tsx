import React from 'react';

interface PercentSearchIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const PercentSearchIcon = React.forwardRef<SVGSVGElement, PercentSearchIconProps>(
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
      {/* Magnifying Glass Lens */}
      <circle cx="10" cy="10" r="6" />
      {/* Magnifying Glass Handle */}
      <line x1="14.5" y1="14.5" x2="21" y2="21" />
      {/* Percent Symbol Line */}
      <line x1="12" y1="8" x2="8" y2="12" strokeWidth={1.5} />
      {/* Percent Symbol Circles (drawn as small dots/circles matching stroke) */}
      <circle cx="8.2" cy="8.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.8" cy="11.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
);

PercentSearchIcon.displayName = 'PercentSearchIcon';
