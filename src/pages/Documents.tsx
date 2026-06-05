import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MoreHorizontal, Download, Upload, FileText, FileSpreadsheet, File, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useData } from '@/context/DataContext';
import { nextId, formatDate, cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { MfgDocument, DocumentCategory, DocumentFileType } from '@/types';

const CATEGORY_VARIANT: Record<DocumentCategory, any> = {
  Procedure: 'accent', Policy: 'purple', Guideline: 'teal', Checklist: 'success',
  Template: 'warning', Design: 'slate', Report: 'outline', Certificate: 'success',
};

const FILE_ICON: Record<DocumentFileType, any> = { PDF: FileText, DOCX: FileText, XLSX: FileSpreadsheet, DWG: File, IMAGE: ImageIcon };

const EXT_TO_TYPE: Record<string, DocumentFileType> = {
  PDF: 'PDF', DOC: 'DOCX', DOCX: 'DOCX', XLS: 'XLSX', XLSX: 'XLSX', CSV: 'XLSX',
  DWG: 'DWG', PNG: 'IMAGE', JPG: 'IMAGE', JPEG: 'IMAGE', GIF: 'IMAGE', WEBP: 'IMAGE', SVG: 'IMAGE',
};

const humanSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const stripExt = (name: string) => name.replace(/\.[^.]+$/, '');
const ensureExt = (name: string, ext: string) => `${stripExt(name)}.${ext}`;

const dataURLToBlob = (dataUrl: string): Blob => {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const bin = atob(b64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

const wrapText = (text: string, width: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { if (line) lines.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines;
};

/** Build a genuinely valid single-page PDF (correct xref offsets) so it opens
 *  in Adobe / browsers without a "damaged file" error. ASCII text only. */
const buildPdf = (title: string, bodyLines: string[]): Blob => {
  const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '?');
  const esc = (s: string) => ascii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let content = `BT\n/F1 16 Tf\n50 760 Td\n(${esc(title)}) Tj\n/F1 11 Tf\n0 -30 Td\n`;
  bodyLines.forEach((ln, i) => { content += `${i > 0 ? '0 -18 Td\n' : ''}(${esc(ln)}) Tj\n`; });
  content += 'ET';

  const objects: Record<number, string> = {
    1: '<< /Type /Catalog /Pages 2 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    4: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    5: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  };

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i <= 5; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xrefStart = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadFile = (doc: MfgDocument) => {
  let blob: Blob;
  let filename = doc.fileName || doc.code;

  if (doc.fileData && doc.fileData.startsWith('data:')) {
    // Real uploaded bytes — download verbatim with its original name/extension.
    blob = dataURLToBlob(doc.fileData);
    filename = doc.fileName || `${doc.code}`;
  } else if ((doc.fileType || 'PDF') === 'PDF') {
    // Generate a valid PDF so it opens cleanly in Adobe (the old code shipped
    // plain text under a .pdf name, which Adobe reports as corrupt).
    blob = buildPdf(doc.name, [
      `Document Code: ${doc.code}`,
      `Version: ${doc.version || '1.0'}`,
      `Category: ${doc.category || '-'}`,
      `Uploaded by: ${doc.uploadedBy || '-'}`,
      '',
      ...wrapText(doc.description || 'No description provided.', 88),
    ]);
    filename = ensureExt(filename, 'pdf');
  } else {
    // No real bytes for non-PDF types — emit a readable text file with a
    // matching .txt extension so it never opens as a broken document.
    const content = `${doc.name}\n${doc.code} · v${doc.version || '1.0'}\n\n${doc.description || ''}\n\nUploaded by: ${doc.uploadedBy || '-'}`;
    blob = new Blob([content], { type: 'text/plain' });
    filename = ensureExt(filename, 'txt');
  }

  triggerDownload(blob, filename);
  toast.success(`Downloaded ${filename}`);
};

export const DocumentsPage = () => {
  const { documents, manufacturingStages, addDocument, updateDocument, deleteDocument } = useData();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocumentCategory>('all');
  const [view, setView] = useState<'table' | 'cards'>('cards');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<MfgDocument | null>(null);
  const initialForm = { name: '', code: '', description: '', manufacturingStageId: '', category: 'Procedure' as DocumentCategory, fileType: 'PDF' as DocumentFileType, fileName: '', fileSize: '', version: '1.0', fileData: '' };
  const [form, setForm] = useState(initialForm);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<MfgDocument | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    setForm((f) => ({
      ...f,
      fileName: file.name,
      fileType: EXT_TO_TYPE[ext] || f.fileType,
      fileSize: humanSize(file.size),
      name: f.name.trim() ? f.name : file.name.replace(/\.[^.]+$/, ''),
    }));
    // Read the real bytes so Download returns the exact uploaded file (no Adobe
    // "damaged file" from a mislabeled extension). Capped to keep mock state sane.
    if (file.size <= 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === 'string') setForm((f) => ({ ...f, fileData: reader.result as string })); };
      reader.onerror = () => setForm((f) => ({ ...f, fileData: '' }));
      reader.readAsDataURL(file);
    } else {
      setForm((f) => ({ ...f, fileData: '' }));
      toast.error('File over 10MB — stored as metadata only');
    }
  };

  const filtered = useMemo(() => documents.filter((d) => {
    if (search && !(d.name + d.code + (d.fileName || '')).toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter !== 'all' && d.manufacturingStageId !== stageFilter) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  }), [documents, search, stageFilter, categoryFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, code: nextId('DOC', documents), manufacturingStageId: manufacturingStages[0]?.id || '' }); setErrs({}); setDrawer(true); };
  const openEdit = (d: MfgDocument) => { setEditing(d); setForm({ name: d.name, code: d.code, description: d.description, manufacturingStageId: d.manufacturingStageId, category: d.category || 'Procedure', fileType: d.fileType || 'PDF', fileName: d.fileName || '', fileSize: d.fileSize || '', version: d.version || '1.0', fileData: d.fileData || '' }); setErrs({}); setDrawer(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.code.trim()) e.code = 'Required';
    if (!form.manufacturingStageId) e.manufacturingStageId = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;
    const payload = { ...form, uploadedBy: 'Current User', uploadedAt: new Date().toISOString() };
    const res = editing ? updateDocument(editing.id, payload) : addDocument(payload);
    if (!res.success) { toast.error(res.error); return; }
    toast.success(editing ? 'Updated' : 'Created');
    setDrawer(false);
  };

  // Counts per category
  const cats: DocumentCategory[] = ['Procedure', 'Policy', 'Guideline', 'Checklist', 'Template', 'Design', 'Report', 'Certificate'];

  const exportRows = filtered.map((d) => ({ Code: d.code, Name: d.name, Category: d.category, Type: d.fileType, FileName: d.fileName, Version: d.version, Stage: manufacturingStages.find((s) => s.id === d.manufacturingStageId)?.name, UploadedBy: d.uploadedBy }));

  const columns: Column<MfgDocument>[] = [
    { key: 'icon', header: '', width: 'w-10', cell: (d) => { const Icon = FILE_ICON[d.fileType || 'PDF']; return <Icon className="h-4 w-4 text-muted-foreground" />; } },
    { key: 'name', header: 'Document', sortable: true, sortValue: (d) => d.name, cell: (d) => (
      <div><p className="font-medium text-sm">{d.name}</p><p className="text-[10px] font-mono text-muted-foreground">{d.code} · v{d.version}</p></div>
    ) },
    { key: 'cat', header: 'Category', cell: (d) => d.category ? <Badge variant={CATEGORY_VARIANT[d.category]}>{d.category}</Badge> : '—' },
    { key: 'file', header: 'File', cell: (d) => <span className="text-xs font-mono text-muted-foreground truncate inline-block max-w-[200px]">{d.fileName}</span> },
    { key: 'size', header: 'Size', cell: (d) => <span className="text-xs">{d.fileSize}</span> },
    { key: 'stage', header: 'Stage', cell: (d) => { const s = manufacturingStages.find((x) => x.id === d.manufacturingStageId); return s ? <Badge variant="outline">{s.name}</Badge> : '—'; } },
    { key: 'actions', header: '', width: 'w-12', cell: (d) => (
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
        <Tooltip content="Download"><Button variant="ghost" size="icon-sm" onClick={() => downloadFile(d)}><Download className="h-3.5 w-3.5" /></Button></Tooltip>
        <Dropdown trigger={<button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>}>
          <DropdownItem onClick={() => downloadFile(d)}><Download className="h-4 w-4" /> Download</DropdownItem>
          <DropdownItem onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /> Edit</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onClick={() => setConfirmDel(d)}><Trash2 className="h-4 w-4" /> Delete</DropdownItem>
        </Dropdown>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Documents"
        description="Procedures, policies, guidelines, checklists, templates and more."
        action={
          <>
            <DataToolbar data={exportRows} filename="pqas-documents" />
            <Button variant="accent" onClick={openAdd}><Upload className="h-4 w-4" /> Upload Document</Button>
          </>
        }
      />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
        {cats.map((c) => {
          const count = documents.filter((d) => d.category === c).length;
          return (
            <motion.button variants={staggerItem} key={c}
              onClick={() => setCategoryFilter((cur) => cur === c ? 'all' : c)}
              className={`p-3 rounded-lg border text-left transition-colors ${categoryFilter === c ? 'border-accent bg-accent/5' : 'hover:border-accent/40'}`}
            >
              <p className="text-2xl font-bold tabular-nums">{count}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" className="sm:w-72" />
        <Select value={stageFilter} onChange={setStageFilter} options={[{ label: 'All Stages', value: 'all' }, ...manufacturingStages.map((s) => ({ label: s.name, value: s.id }))]} className="sm:w-56" />
        <Select value={categoryFilter} onChange={(v) => setCategoryFilter(v as any)} options={[{ label: 'All Categories', value: 'all' }, ...cats.map((c) => ({ label: c, value: c }))]} className="sm:w-44" />
        <div className="ml-auto inline-flex rounded-md border p-0.5">
          <button onClick={() => setView('cards')} className={`px-2.5 py-1.5 rounded text-xs ${view === 'cards' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Cards</button>
          <button onClick={() => setView('table')} className={`px-2.5 py-1.5 rounded text-xs ${view === 'table' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>Table</button>
        </div>
      </div>

      {view === 'table' ? (
        <DataTable columns={columns} data={filtered} emptyTitle="No documents" />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? <Card className="p-12 text-center text-sm text-muted-foreground col-span-full">No documents match filters</Card> :
            filtered.map((d) => {
              const Icon = FILE_ICON[d.fileType || 'PDF'];
              return (
                <motion.div variants={staggerItem} key={d.id}>
                  <Card className="p-4 hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Icon className="h-5 w-5" /></div>
                      {d.category && <Badge variant={CATEGORY_VARIANT[d.category]}>{d.category}</Badge>}
                    </div>
                    <p className="font-semibold text-sm mb-1">{d.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">{d.code} · v{d.version}</p>
                    <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2">{d.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t">
                      <span>{d.fileSize}</span><span>{d.uploadedBy}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadFile(d)}><Download className="h-3.5 w-3.5" /> Download</Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          }
        </motion.div>
      )}

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Document' : 'Upload Document'} onSubmit={submit} submitLabel={editing ? 'Update' : 'Upload'}>
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />{errs.name && <p className="text-xs text-destructive">{errs.name}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Code <span className="text-destructive">*</span></Label><Input value={form.code} error={!!errs.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrs({ ...errs, code: '' }); }} />{errs.code && <p className="text-xs text-destructive">{errs.code}</p>}</div>
          <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Category</Label>
            <Select value={form.category} onChange={(v) => setForm({ ...form, category: v as DocumentCategory })} options={cats.map((c) => ({ label: c, value: c }))} />
          </div>
          <div className="space-y-1.5"><Label>File Type</Label>
            <Select value={form.fileType} onChange={(v) => setForm({ ...form, fileType: v as DocumentFileType })} options={[{ label: 'PDF', value: 'PDF' }, { label: 'DOCX', value: 'DOCX' }, { label: 'XLSX', value: 'XLSX' }, { label: 'DWG (Drawing)', value: 'DWG' }, { label: 'Image', value: 'IMAGE' }]} />
          </div>
        </div>
        <div className="space-y-1.5"><Label>File Name</Label><Input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="e.g., procedure.pdf" /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
        <div className="space-y-1.5"><Label>Manufacturing Stage <span className="text-destructive">*</span></Label>
          <Select value={form.manufacturingStageId} onChange={(v) => { setForm({ ...form, manufacturingStageId: v }); setErrs({ ...errs, manufacturingStageId: '' }); }} options={manufacturingStages.map((s) => ({ label: s.name, value: s.id }))} error={!!errs.manufacturingStageId} />
          {errs.manufacturingStageId && <p className="text-xs text-destructive">{errs.manufacturingStageId}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.dwg,.png,.jpg,.jpeg,.gif,.webp,.svg"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptUpload(f); e.target.value = ''; }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) acceptUpload(f); }}
          className={cn(
            'w-full p-4 rounded-lg border-2 border-dashed text-center transition-colors',
            dragOver ? 'border-accent bg-accent/5' : 'hover:border-accent/40'
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          {form.fileName ? (
            <>
              <p className="text-xs font-medium text-foreground truncate">{form.fileName}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{form.fileSize || 'Ready'} · click to replace</p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Drag file here or click to upload</p>
              <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, XLSX, DWG up to 10MB</p>
            </>
          )}
        </button>
      </FormDrawer>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)} entityName={confirmDel?.name}
        onConfirm={() => { if (confirmDel) { deleteDocument(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); } }} />
    </PageWrapper>
  );
};
