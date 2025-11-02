import React from 'react';
import { cn } from '@/lib/utils';
export const VortexBackground = ({
  className,
}: {
  className?: string;
}) => {
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
        <div className="absolute inset-0 w-full h-full bg-dark-navy [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div
          className="absolute inset-0 h-full w-full opacity-20 animate-vortex-spin"
          style={{
            backgroundImage: 'conic-gradient(from 90deg at 50% 50%, #0a192f 0%, #64ffda 25%, #0a192f 100%)',
          }}
        />
      </div>
    </div>
  );
};