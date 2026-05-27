import { useState, useEffect, useRef } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const InlineEdit = ({ value, onSave, className, disabled, placeholder }: InlineEditProps) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setVal(value), [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setVal(value);
    setEditing(false);
  };

  const cancel = () => { setVal(value); setEditing(false); };

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn('group inline-flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 text-left transition-colors hover:bg-muted disabled:hover:bg-transparent', className)}
      >
        <span>{value}</span>
        {!disabled && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        onBlur={save}
        placeholder={placeholder}
        className="h-7 rounded border border-accent bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button type="button" onClick={save} className="rounded p-0.5 text-success hover:bg-success/10"><Check className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={cancel} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
    </span>
  );
};
