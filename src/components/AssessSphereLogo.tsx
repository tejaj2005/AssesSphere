import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textVariant?: 'auto' | 'light' | 'dark';
}

/**
 * AssessSphere brand mark — uses #0e5467 (dark azure) + #f5af12 (golden orange).
 * Sphere icon with checkmark + triangle frame (three quality pillars).
 */
export const AssessSphereLogo = ({ size = 32, className, showText = false, textVariant = 'auto' }: LogoProps) => {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id="as-sphere" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0e5467" />
            <stop offset="1" stopColor="#0a3d4d" />
          </linearGradient>
        </defs>
        <path d="M32 6 L60 56 L4 56 Z" stroke="#f5af12" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <circle cx="32" cy="34" r="18" fill="url(#as-sphere)" />
        <ellipse cx="26" cy="28" rx="6" ry="3.5" fill="white" opacity="0.18" />
        <path d="M23 34 L29.5 41 L42 27" stroke="#f5af12" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-bold tracking-tight text-base">
            <span className={textVariant === 'light' ? 'text-white' : 'text-[#0e5467]'}>Assess</span>
            <span className="text-[#f5af12]">Sphere</span>
          </span>
          <span className="text-[9px] font-medium tracking-[0.18em] uppercase text-muted-foreground mt-0.5">by QMICS</span>
        </span>
      )}
    </span>
  );
};

/** White variant for use on the dark sidebar background */
export const AssessSphereLogoWhite = ({ size = 32, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={cn('shrink-0', className)}>
    <path d="M32 6 L60 56 L4 56 Z" stroke="#f5af12" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    <circle cx="32" cy="34" r="18" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" />
    <ellipse cx="26" cy="28" rx="6" ry="3.5" fill="white" opacity="0.25" />
    <path d="M23 34 L29.5 41 L42 27" stroke="#f5af12" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Two-tone wordmark — "Assess" in #0e5467, "Sphere" in #f5af12.
 *  Use on white/light surfaces. */
export const AssessSphereWordmark = ({ className }: { className?: string }) => (
  <span className={cn('font-bold tracking-tight', className)}>
    <span className="text-[#0e5467]">Assess</span>
    <span className="text-[#f5af12]">Sphere</span>
  </span>
);
