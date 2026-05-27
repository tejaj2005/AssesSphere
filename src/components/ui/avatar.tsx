import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-indigo-500'];

export const Avatar = ({ name, size = 'md', className }: AvatarProps) => {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = COLORS[hash % COLORS.length];
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';
  return (
    <div className={cn('inline-flex items-center justify-center rounded-full font-medium text-white shrink-0', color, sz, className)}>
      {initials}
    </div>
  );
};
