import { Badge } from '@/components/ui/badge';

export const TagChip = ({ children, variant = 'accent' }: { children: React.ReactNode; variant?: any }) => (
  <Badge variant={variant} className="text-[10px] py-0 h-5">{children}</Badge>
);
