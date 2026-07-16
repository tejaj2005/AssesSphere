import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Explicit destination. When omitted, navigates back in history (-1). */
  to?: string;
  label?: string;
  className?: string;
}

/**
 * Consistent back-navigation control for detail and sub pages.
 * Falls back to browser history when no `to` is provided.
 */
export const BackButton = ({ to, label = 'Back', className }: BackButtonProps) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={cn(
        'group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
};
