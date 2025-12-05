import React from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  // Theme-aware CSS variables
  const auroraGradient = isDark
    ? "repeating-linear-gradient(100deg,#6366f1_10%,#818cf8_15%,#a5b4fc_20%,#c4b5fd_25%,#8b5cf6_30%)"
    : "repeating-linear-gradient(100deg,#EA580C_10%,#F97316_15%,#FDBA74_20%,#FED7AA_25%,#EA580C_30%)";

  return (
    <div
      className={cn(
        "relative flex flex-col h-full items-center justify-center",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div
          className={cn(
            `pointer-events-none absolute -inset-[10px] will-change-transform`,
            isDark ? "opacity-50" : "opacity-30",
            !prefersReducedMotion && "after:animate-aurora"
          )}
          style={{
            backgroundImage: `repeating-linear-gradient(100deg,${isDark ? '#000' : '#fff'}_0%,${isDark ? '#000' : '#fff'}_7%,transparent_10%,transparent_12%,${isDark ? '#000' : '#fff'}_16%), ${auroraGradient}`,
            backgroundSize: '300%, 200%',
            backgroundPosition: '50% 50%, 50% 50%',
            filter: 'blur(10px)',
            ...(showRadialGradient && {
              maskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
            }),
          }}
        >
          <div
            className={cn(
              "absolute inset-0 mix-blend-difference",
              !prefersReducedMotion && "animate-aurora"
            )}
            style={{
              backgroundImage: `repeating-linear-gradient(100deg,${isDark ? '#000' : '#fff'}_0%,${isDark ? '#000' : '#fff'}_7%,transparent_10%,transparent_12%,${isDark ? '#000' : '#fff'}_16%), ${auroraGradient}`,
              backgroundSize: '200%, 100%',
              backgroundAttachment: 'fixed',
            }}
          />
        </div>
      </div>
      {children}
    </div>
  );
};

export function AuroraBackgroundWrapper() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {!prefersReducedMotion && (
        <style>
          {`
          @keyframes aurora {
            from {
              background-position: 50% 50%, 50% 50%;
            }
            to {
              background-position: 350% 50%, 350% 50%;
            }
          }
          .animate-aurora {
            animation: aurora 60s linear infinite;
          }
          `}
        </style>
      )}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
        <AuroraBackground />
      </div>
    </>
  );
}
