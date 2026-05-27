import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  description?: string;
  entityName?: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  variant?: 'destructive' | 'default';
}

export const ConfirmDialog = ({
  open, onOpenChange, title = 'Are you sure?', description, entityName,
  onConfirm, confirmLabel = 'Delete', variant = 'destructive',
}: ConfirmDialogProps) => {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {(description || entityName) && (
              <DialogDescription className="mt-1.5">
                {description || (
                  <>You are about to delete <span className="font-medium text-foreground">{entityName}</span>. This action cannot be undone.</>
                )}
              </DialogDescription>
            )}
          </div>
        </div>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'accent'} onClick={handle} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
