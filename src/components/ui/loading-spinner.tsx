import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className, fullScreen = true }: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('animate-spin rounded-full border-b-2 border-primary', sizeClasses[size], className)} />
  );

  if (fullScreen) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
