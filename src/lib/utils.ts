import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (d: string | Date, f = 'PP') => format(new Date(d), f);
export const relativeTime = (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true });

export function nextId(prefix: string, items: { id: string }[], digits = 3): string {
  const nums = items
    .map((i) => parseInt(i.id.split('-')[1] || '0', 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(digits, '0')}`;
}

export const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 250) => {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
};

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
