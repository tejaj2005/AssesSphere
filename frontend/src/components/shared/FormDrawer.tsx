import { ReactNode, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
}

export const FormDrawer = ({
  open, onOpenChange, title, description, children, onSubmit,
  submitLabel = 'Save', cancelLabel = 'Cancel', submitDisabled,
}: FormDrawerProps) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || submitDisabled) return;
    setBusy(true);
    try { await new Promise((r) => setTimeout(r, 300)); await onSubmit(); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">{children}</div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>{cancelLabel}</Button>
          <Button type="submit" variant="accent" disabled={busy || submitDisabled}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
};
