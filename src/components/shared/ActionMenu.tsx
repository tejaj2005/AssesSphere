/**
 * Universal 3-dot action menu used in every list/table across all roles.
 * Pass an `actions[]` config — actions are filtered by their `show` flag for
 * role-gating.
 */
import { ReactNode } from 'react';
import { MoreVertical, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';

export interface ActionItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  /** If false, action is hidden (role-gating) */
  show?: boolean;
  /** Renders item disabled with greyed appearance */
  disabled?: boolean;
  danger?: boolean;
  /** Insert a separator BEFORE this item */
  separatorBefore?: boolean;
  /** Optional tooltip / right-side hint */
  hint?: string;
}

interface ActionMenuProps {
  actions: ActionItem[];
  /** Visual style of the trigger */
  variant?: 'vertical' | 'horizontal';
  triggerClassName?: string;
  align?: 'left' | 'right';
  /** Custom trigger element (overrides default 3-dot icon) */
  customTrigger?: ReactNode;
}

export const ActionMenu = ({ actions, variant = 'horizontal', triggerClassName, align = 'right', customTrigger }: ActionMenuProps) => {
  const visible = actions.filter((a) => a.show !== false);
  if (visible.length === 0) return null;
  const TriggerIcon = variant === 'vertical' ? MoreVertical : MoreHorizontal;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown
        align={align}
        trigger={customTrigger ?? (
          <button
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-secondary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              triggerClassName
            )}
            aria-label="Actions"
          >
            <TriggerIcon className="h-4 w-4" />
          </button>
        )}
      >
        {visible.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={`${a.label}-${i}`}>
              {a.separatorBefore && i > 0 && <DropdownSeparator />}
              <DropdownItem onClick={a.disabled ? undefined : a.onClick} danger={a.danger} disabled={a.disabled} className="justify-between">
                <span className="inline-flex items-center gap-2">{Icon && <Icon className="h-4 w-4" />}{a.label}</span>
                {a.hint && <span className="text-[10px] text-muted-foreground ml-3">{a.hint}</span>}
              </DropdownItem>
            </div>
          );
        })}
      </Dropdown>
    </div>
  );
};
