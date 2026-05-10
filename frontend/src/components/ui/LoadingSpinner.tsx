import { Loader2 } from 'lucide-react';
import { cn } from './Button';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center w-full h-full min-h-[200px]", className)}>
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );
}
