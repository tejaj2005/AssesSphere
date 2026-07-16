import { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="text-base font-semibold">{title}</h3>
    {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
