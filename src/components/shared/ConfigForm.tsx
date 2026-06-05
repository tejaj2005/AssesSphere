/**
 * Config-driven form renderer.
 * Pass `fields` and `value` — get a fully rendered, validated form.
 * Used by Organization, Department, User, Product, Component, Stage, Inspection,
 * Material, Supplier and every other entity edit dialog in the system.
 */
import { useState, useEffect, ReactNode, useRef } from 'react';
import { Upload, X, Star, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { cn, isValidEmail } from '@/lib/utils';

export type FieldType =
  | 'text' | 'email' | 'url' | 'tel' | 'number' | 'date'
  | 'textarea' | 'select' | 'multi-select' | 'toggle'
  | 'checkbox' | 'file' | 'rating' | 'readonly' | 'hidden' | 'static';

export interface FieldOption { label: string; value: string }

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: FieldOption[];
  /** Grid width: 'full' (default), 'half', 'third' */
  col?: 'full' | 'half' | 'third';
  /** Section header before this field */
  section?: string;
  /** Custom validate, return error message or null */
  validate?: (v: any, all: Record<string, any>) => string | null;
  /** Inline render if needed */
  render?: (value: any, onChange: (v: any) => void) => ReactNode;
  /** Auto fill on change of dependency */
  dependsOn?: string;
}

interface ConfigFormProps {
  fields: FieldDef[];
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
}

export const ConfigForm = ({ fields, value, onChange, errors = {}, readOnly = false }: ConfigFormProps) => {
  const set = (n: string, v: any) => onChange({ ...value, [n]: v });

  // Group by section
  const sections: { label?: string; fields: FieldDef[] }[] = [];
  let current: { label?: string; fields: FieldDef[] } | null = null;
  for (const f of fields) {
    if (f.section || !current) {
      current = { label: f.section, fields: [] };
      sections.push(current);
    }
    current.fields.push(f);
  }

  return (
    <div className="space-y-5">
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.label && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2 mt-1">{sec.label}</p>
          )}
          <div className="grid grid-cols-6 gap-3">
            {sec.fields.filter((f) => f.type !== 'hidden').map((f) => {
              const colClass = f.col === 'third' ? 'col-span-6 sm:col-span-2' : f.col === 'half' ? 'col-span-6 sm:col-span-3' : 'col-span-6';
              const v = value[f.name];
              const err = errors[f.name];
              return (
                <div key={f.name} className={cn(colClass, 'space-y-1.5')}>
                  {f.type !== 'toggle' && f.type !== 'checkbox' && (
                    <Label htmlFor={f.name}>
                      {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                  )}
                  <FieldRenderer field={f} value={v} onChange={(nv) => set(f.name, nv)} error={err} readOnly={readOnly} />
                  {f.help && !err && <p className="text-[10px] text-muted-foreground">{f.help}</p>}
                  {err && <p className="text-[10px] text-destructive">{err}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const FieldRenderer = ({ field, value, onChange, error, readOnly }: { field: FieldDef; value: any; onChange: (v: any) => void; error?: string; readOnly?: boolean }) => {
  const disabled = readOnly;
  if (field.render) return <>{field.render(value, onChange)}</>;

  switch (field.type) {
    case 'static':
    case 'readonly':
      return <div className="text-sm text-foreground px-3 py-2 rounded-lg bg-secondary border border-border/40">{value || '—'}</div>;

    case 'date':
      return <DatePicker id={field.name} value={value ?? ''} disabled={disabled} error={!!error} placeholder={field.placeholder || 'Select date'} onChange={onChange} />;

    case 'text': case 'email': case 'url': case 'tel': case 'number':
      return <Input id={field.name} type={field.type} value={value ?? ''} disabled={disabled} placeholder={field.placeholder} error={!!error}
        onChange={(e) => onChange(field.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value)} />;

    case 'textarea':
      return <Textarea id={field.name} value={value ?? ''} disabled={disabled} placeholder={field.placeholder} error={!!error}
        onChange={(e) => onChange(e.target.value)} rows={3} />;

    case 'select':
      return <Select value={value ?? ''} disabled={disabled} options={field.options || []} placeholder={field.placeholder || 'Select…'} error={!!error}
        onChange={onChange} />;

    case 'multi-select':
      return <MultiChipSelect options={field.options || []} values={Array.isArray(value) ? value : []} onChange={onChange} disabled={disabled} />;

    case 'toggle':
      return (
        <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Switch checked={!!value} onCheckedChange={onChange} disabled={disabled} />
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
          <Checkbox checked={!!value} onCheckedChange={onChange} disabled={disabled} />
          <Label className="text-sm font-medium cursor-pointer" onClick={() => !disabled && onChange(!value)}>{field.label}</Label>
        </div>
      );

    case 'file':
      return <FileInput value={value} onChange={onChange} disabled={disabled} />;

    case 'rating':
      return <RatingInput value={typeof value === 'number' ? value : 0} onChange={onChange} disabled={disabled} />;

    default:
      return null;
  }
};

const MultiChipSelect = ({ options, values, onChange, disabled }: { options: FieldOption[]; values: string[]; onChange: (v: string[]) => void; disabled?: boolean }) => {
  const toggle = (v: string) => {
    if (disabled) return;
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border bg-card min-h-[40px]">
      {options.length === 0 ? <span className="text-xs text-muted-foreground italic">No options</span> :
        options.map((o) => {
          const selected = values.includes(o.value);
          return (
            <button key={o.value} type="button" onClick={() => toggle(o.value)} disabled={disabled}
              className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors',
                selected ? 'bg-accent text-accent-foreground border-accent' : 'hover:border-accent/40')}>
              {o.label}
            </button>
          );
        })}
    </div>
  );
};

const readAsDataURL = (file: File) => new Promise<string>((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(typeof r.result === 'string' ? r.result : file.name);
  r.onerror = () => resolve(file.name);
  r.readAsDataURL(file);
});

const isImageEntry = (s: string) => s.startsWith('data:image');

const FileInput = ({ value, onChange, disabled }: { value?: string | string[]; onChange: (v: string[]) => void; disabled?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    // Read images as data URLs so they can be previewed and persisted; keep
    // other file types as their name (no real storage in this mock backend).
    const added = await Promise.all(
      Array.from(e.target.files).map((f) => (f.type.startsWith('image/') ? readAsDataURL(f) : Promise.resolve(f.name))),
    );
    onChange([...files, ...added]);
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className="space-y-2">
      <button type="button" disabled={disabled} onClick={() => ref.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors text-sm text-muted-foreground disabled:opacity-50">
        <Upload className="h-4 w-4" /> Click to upload or drag files
      </button>
      <input ref={ref} type="file" multiple className="hidden" onChange={handle} />
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary text-xs">
              {isImageEntry(f)
                ? <img src={f} alt="upload preview" className="h-8 w-8 rounded object-cover border border-border/60 shrink-0" />
                : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className="flex-1 truncate">{isImageEntry(f) ? 'Uploaded image' : f}</span>
              <button onClick={() => onChange(files.filter((_, ix) => ix !== i))} disabled={disabled} className="text-destructive"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RatingInput = ({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) => (
  <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-card">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={disabled} onClick={() => onChange(n)} className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50">
        <Star className={cn('h-5 w-5', n <= value ? 'fill-[#f5af12] text-[#f5af12]' : 'text-muted-foreground/40')} />
      </button>
    ))}
    <span className="ml-2 text-sm font-medium tabular-nums">{value}/5</span>
  </div>
);

/** Validate a config-driven form. Returns { valid, errors }. */
export const validateConfigForm = (fields: FieldDef[], value: Record<string, any>): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = value[f.name];
    if (f.required) {
      if (v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)) {
        errors[f.name] = 'Required';
        continue;
      }
    }
    if (v && f.type === 'email' && !isValidEmail(v)) { errors[f.name] = 'Invalid email'; continue; }
    if (v && f.type === 'url' && !/^https?:\/\//.test(v)) { errors[f.name] = 'Must start with http(s)://'; continue; }
    if (f.validate) {
      const err = f.validate(v, value);
      if (err) errors[f.name] = err;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
};
