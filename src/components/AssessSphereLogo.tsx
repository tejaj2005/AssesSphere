import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'icon' | 'full' | 'compact';
  showText?: boolean;
}

export const AssessSphereLogo = ({ size = 32, className, variant = 'icon', showText = false }: LogoProps) => {
  const dim = size;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={dim} height={dim} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id="as-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="hsl(195 75% 30%)" />
            <stop offset="1" stopColor="hsl(190 75% 18%)" />
          </linearGradient>
          <linearGradient id="as-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F2B544" />
            <stop offset="1" stopColor="#D89427" />
          </linearGradient>
        </defs>
        {/* Triangle frame (quality assurance — three pillars) */}
        <path d="M32 6 L60 56 L4 56 Z" stroke="url(#as-gold)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        {/* Sphere body */}
        <circle cx="32" cy="34" r="18" fill="url(#as-grad)" />
        {/* Inner highlight */}
        <ellipse cx="26" cy="28" rx="6" ry="3.5" fill="white" opacity="0.18" />
        {/* Checkmark */}
        <path d="M23 34 L29.5 41 L42 27" stroke="url(#as-gold)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-bold tracking-tight text-base">AssessSphere</span>
          <span className="text-[9px] font-medium tracking-[0.18em] uppercase text-muted-foreground mt-0.5">by QMICS</span>
        </span>
      )}
    </span>
  );
};

// White variant for dark sidebar
export const AssessSphereLogoWhite = ({ size = 32, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={cn('shrink-0', className)}>
    <path d="M32 6 L60 56 L4 56 Z" stroke="#F2B544" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    <circle cx="32" cy="34" r="18" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" />
    <ellipse cx="26" cy="28" rx="6" ry="3.5" fill="white" opacity="0.25" />
    <path d="M23 34 L29.5 41 L42 27" stroke="#F2B544" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
