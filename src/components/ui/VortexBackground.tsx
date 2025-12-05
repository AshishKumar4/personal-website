import React from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

export const VortexBackground = ({
  className,
}: {
  className?: string;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  // Theme-aware colors
  const bgColor = isDark ? '#0a192f' : '#FAFAFA';
  const accentColor = isDark ? '#64ffda' : '#EA580C';

  return (
    <div className={cn("fixed inset-0 w-full h-full -z-10 overflow-hidden", className)}>
      <style>
        {`
          @keyframes vortex-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-vortex-spin {
            animation: vortex-spin 60s linear infinite;
          }
        `}
      </style>
      <div
        className="absolute inset-0 w-full h-full bg-transparent"
      >
        <div
          className="absolute inset-0 w-full h-full [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
          style={{ backgroundColor: bgColor }}
        />
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            isDark ? "opacity-20" : "opacity-15",
            !prefersReducedMotion && "animate-vortex-spin"
          )}
          style={{
            backgroundImage: `conic-gradient(from 90deg at 50% 50%, ${bgColor} 0%, ${accentColor} 25%, ${bgColor} 100%)`,
          }}
        />
      </div>
    </div>
  );
};
