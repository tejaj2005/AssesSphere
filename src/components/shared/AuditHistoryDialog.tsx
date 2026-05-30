/**
 * Audit history dialog — shows the audit log entries for a specific entity.
 * Used by the View History action in ActionMenus across all entity pages.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, Plus, Pencil, Trash2, FileText, Clock, User as UserIcon } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/context/DataContext';
import { relativeTime, formatDate, cn } from '@/lib/utils';

interface AuditHistoryDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entityType?: string;
  entityName?: string;
  /** Override the title — defaults to "{entityName} — History" */
  title?: string;
}

const ACTION_STYLE = {
  Created: { Icon: Plus,    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' },
  Updated: { Icon: Pencil,  cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' },
  Deleted: { Icon: Trash2,  cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400' },
} as const;

export const AuditHistoryDialog = ({ open, onOpenChange, entityType, entityName, title }: AuditHistoryDialogProps) => {
  const { auditLog } = useData();

  const filtered = useMemo(() => {
    return auditLog.filter((entry) => {
      if (entityType && entry.entityType !== entityType) return false;
      if (entityName && entry.entityName !== entityName) return false;
      return true;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [auditLog, entityType, entityName]);

  const dialogTitle = title || (entityName ? `${entityName} — History` : 'Audit History');

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="!max-w-2xl">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0e5467]/10 text-[#0e5467] shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{filtered.length} event{filtered.length !== 1 ? 's' : ''} recorded</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No history yet</p>
            <p className="text-xs text-muted-foreground">Events will appear here as they happen.</p>
          </div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-3">
            {filtered.map((entry, i) => {
              const style = ACTION_STYLE[entry.action];
              const Icon = style.Icon;
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="ml-6"
                >
                  <span className={cn('absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border', style.cls)}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm">
                        <span className="font-medium">{entry.userName}</span>
                        <span className="text-muted-foreground"> {entry.action.toLowerCase()} </span>
                        <span className="font-medium">{entry.entityType}</span>
                      </p>
                      <Badge className={cn('text-[10px] font-mono', style.cls)}>{entry.action}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <FileText className="h-3 w-3" /> <span className="font-medium text-foreground/80">{entry.entityName}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" /> {relativeTime(entry.timestamp)}
                      <span>·</span>
                      <span title={formatDate(entry.timestamp, 'PPpp')}>{formatDate(entry.timestamp)}</span>
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </Dialog>
  );
};
