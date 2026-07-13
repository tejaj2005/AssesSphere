import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, MoreHorizontal, Download, Upload, FileText, FileSpreadsheet, File, Image as ImageIcon, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataToolbar } from '@/components/shared/DataToolbar';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { AIDocumentAnalyzer } from '@/components/ai/AIDocumentAnalyzer';
import { useApiResource } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { DocumentCategory, DocumentFileType } from '@/types';

// Origin the server serves uploaded files from (API_BASE minus the trailing /api).
const FILE_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

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

/** Uploaded documents now have real bytes on the server — download by pointing
 *  the browser at the file's server-side URL rather than fabricating content. */
const downloadFile = (doc: any) => {
  if (!doc.fileUrl) { toast.error('No file attached to this document'); return; }
  const href = `${FILE_ORIGIN}${doc.fileUrl}`;
  const a = document.createElement('a');
  a.href = href;
  a.download = doc.fileName || doc.documentId || doc.name;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const DocumentsPage = () => {
  const { user } = useAuth();
  const { items: documents, loading, create, update, remove } = useApiResource<any>('/documents');
  const { items: manufacturingStages } = useApiResource<any>('/admin/manufacturing-stages');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocumentCategory>('all');
  const [view, setView] = useState<'table' | 'cards'>('cards');
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const initialForm = { name: '', code: '', description: '', manufacturingStageId: '', category: 'Procedure' as DocumentCategory, fileType: 'PDF' as DocumentFileType, fileName: '', fileSize: '', version: '1.0' };
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptUpload = (f: File) => {
    const ext = f.name.split('.').pop()?.toUpperCase() || '';
    setFile(f);
    setForm((prev) => ({
      ...prev,
      fileName: f.name,
      fileType: EXT_TO_TYPE[ext] || prev.fileType,
      fileSize: humanSize(f.size),
      name: prev.name.trim() ? prev.name : f.name.replace(/\.[^.]+$/, ''),
    }));
  };

  const stageIdOf = (d: any) => (typeof d.manufacturingStage === 'object' ? d.manufacturingStage?._id : d.manufacturingStage) || '';

  const filtered = useMemo(() => documents.filter((d) => {
    if (search && !(d.name + (d.documentId || '') + (d.fileName || '')).toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter !== 'all' && stageIdOf(d) !== stageFilter) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  }), [documents, search, stageFilter, categoryFilter]);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm, manufacturingStageId: manufacturingStages[0]?.id || '' }); setFile(null); setErrs({}); setDrawer(true); };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.documentId || '',
      description: d.description || '',
      manufacturingStageId: stageIdOf(d),
      category: d.category || 'Procedure',
      fileType: d.fileType || 'PDF',
      fileName: d.fileName || '',
      fileSize: d.fileSize || '',
      version: d.version || '1.0',
    });
    setFile(null);
    setErrs({});
    setDrawer(true);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.manufacturingStageId) e.manufacturingStageId = 'Required';
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.append('name', form.name);
    if (form.code.trim()) fd.append('documentId', form.code.trim());
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('fileType', form.fileType);
    fd.append('version', form.version);
    fd.append('manufacturingStage', form.manufacturingStageId);
    if (user?.organization) fd.append('organization', user.organization);
    if (user?.id) fd.append('uploadedBy', user.id);
    if (file) fd.append('file', file);

    setSaving(true);
    try {
      if (editing) await update(editing.id, fd as any);
      else await create(fd as any);
      toast.success(editing ? 'Updated' : 'Uploaded');
      setDrawer(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // Counts per category
  const cats: DocumentCategory[] = ['Procedure', 'Policy', 'Guideline', 'Checklist', 'Template', 'Design', 'Report', 'Certificate'];

  const exportRows = filtered.map((d) => ({ Code: d.documentId, Name: d.name, Category: d.category, Type: d.fileType, FileName: d.fileName, Version: d.version, Stage: d.manufacturingStage?.name, UploadedBy: d.uploadedBy?.name }));

  const columns: Column<any>[] = [
    { key: 'icon', header: '', width: 'w-10', cell: (d) => { const Icon = FILE_ICON[(d.fileType || 'PDF') as DocumentFileType]; return <Icon className="h-4 w-4 text-muted-foreground" />; } },
    { key: 'name', header: 'Document', sortable: true, sortValue: (d) => d.name, cell: (d) => (
      <div><p className="font-medium text-sm">{d.name}</p><p className="text-[10px] font-mono text-muted-foreground">{d.documentId} · v{d.version}</p></div>
    ) },
    { key: 'cat', header: 'Category', cell: (d) => d.category ? <Badge variant={CATEGORY_VARIANT[d.category as DocumentCategory]}>{d.category}</Badge> : '—' },
    { key: 'file', header: 'File', cell: (d) => <span className="text-xs font-mono text-muted-foreground truncate inline-block max-w-[200px]">{d.fileName}</span> },
    { key: 'size', header: 'Size', cell: (d) => <span className="text-xs">{d.fileSize}</span> },
    { key: 'stage', header: 'Stage', cell: (d) => d.manufacturingStage?.name ? <Badge variant="outline">{d.manufacturingStage.name}</Badge> : '—' },
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

  if (loading) return <PageWrapper><LoadingSkeleton /></PageWrapper>;

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

      <Card className="mb-4">
        <button
          type="button"
          onClick={() => setAiOpen((o) => !o)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-accent" /> Analyze a Document with AI
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', aiOpen && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {aiOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border p-4 pt-4">
                <AIDocumentAnalyzer />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

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
              const Icon = FILE_ICON[(d.fileType || 'PDF') as DocumentFileType];
              return (
                <motion.div variants={staggerItem} key={d.id}>
                  <Card className="p-4 hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0"><Icon className="h-5 w-5" /></div>
                      {d.category && <Badge variant={CATEGORY_VARIANT[d.category as DocumentCategory]}>{d.category}</Badge>}
                    </div>
                    <p className="font-semibold text-sm mb-1">{d.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">{d.documentId} · v{d.version}</p>
                    <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2">{d.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t">
                      <span>{d.fileSize}</span><span>{d.uploadedBy?.name}</span>
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

      <FormDrawer open={drawer} onOpenChange={setDrawer} title={editing ? 'Edit Document' : 'Upload Document'} onSubmit={submit} submitLabel={saving ? 'Saving…' : editing ? 'Update' : 'Upload'}>
        <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} error={!!errs.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrs({ ...errs, name: '' }); }} />{errs.name && <p className="text-xs text-destructive">{errs.name}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Auto-generated if blank" /></div>
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
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove(confirmDel.id);
            toast.success('Deleted');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong');
          } finally {
            setConfirmDel(null);
          }
        }} />
    </PageWrapper>
  );
};
