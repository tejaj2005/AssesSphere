import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textVariant?: 'light' | 'dark';
  showPoweredBy?: boolean;
}

/**
 * AssessSphere logo — uses the /assesssphere-mark.svg asset.
 * Triangle frame + circle + checkmark with the brand's blue + gold palette.
 * Max-height 40px, object-fit contain, vertically + horizontally centered.
 */
export const AssessSphereLogo = ({ size = 40, className, showText = false, textVariant = 'dark', showPoweredBy = false }: LogoProps) => (
  <span className={cn('inline-flex items-center gap-3', className)}>
    <img src="/assesssphere-mark.svg" alt="AssessSphere" width={size} height={size}
      className="object-contain max-h-10 shrink-0" style={{ maxHeight: 40 }} />
    {showText && (
      <span className="flex flex-col leading-none">
        <span className="font-extrabold tracking-tight text-base italic">
          <span className={textVariant === 'light' ? 'text-white' : 'text-[#0e5467]'}>Assess</span>
          <span className="text-[#f5af12]">Sphere</span>
        </span>
        {showPoweredBy && (
          <span className={cn('text-[10px] font-medium tracking-[0.05em] mt-1', textVariant === 'light' ? 'text-white/60' : 'text-[#5a8a97]')}>
            Powered by QMICS
          </span>
        )}
      </span>
    )}
  </span>
);

/** White variant for use on the dark sidebar background */
export const AssessSphereLogoWhite = ({ size = 36, className }: { size?: number; className?: string }) => (
  <img src="/assesssphere-mark.svg" alt="AssessSphere" width={size} height={size}
    className={cn('object-contain max-h-10 shrink-0', className)} style={{ maxHeight: 40 }} />
);

/** Two-tone wordmark — "Assess" in #0e5467, "Sphere" in #f5af12. */
export const AssessSphereWordmark = ({ className }: { className?: string }) => (
  <span className={cn('font-extrabold tracking-tight italic', className)}>
    <span className="text-[#0e5467]">Assess</span>
    <span className="text-[#f5af12]">Sphere</span>
  </span>
);

/** Full-width horizontal banner with mark + wordmark — use for hero areas */
export const AssessSphereBanner = ({ height = 72, className }: { height?: number; className?: string }) => (
  <img src="/assesssphere-logo.svg" alt="AssessSphere" style={{ height }} className={cn('w-auto object-contain', className)} />
);
