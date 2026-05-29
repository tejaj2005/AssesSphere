import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TypedConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  /** The exact text the user must type to confirm */
  confirmationText: string;
  /** Label above the input — e.g. "Type product code to confirm" */
  promptLabel?: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
}

export const TypedConfirmDialog = ({ open, onOpenChange, title, description, confirmationText, promptLabel, onConfirm, confirmLabel = 'Delete forever' }: TypedConfirmDialogProps) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed === confirmationText;

  const handle = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); setTyped(''); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTyped(''); }}>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription className="mt-1.5">{description}</DialogDescription>}
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-2 my-2">
        <Label className="text-xs">{promptLabel || `Type "${confirmationText}" to confirm`}</Label>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmationText} autoFocus error={typed.length > 0 && !matches} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="destructive" onClick={handle} disabled={busy || !matches}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
