import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
}

export const PageHeader = ({ title, description, action, meta }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
    <div className="flex flex-col gap-1 min-w-0">
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground leading-7">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {meta && <div className="mt-1">{meta}</div>}
    </div>
    {action && <div className="flex items-center gap-2 shrink-0 flex-wrap">{action}</div>}
  </div>
);
