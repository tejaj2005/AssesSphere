import { useRef } from 'react';
import { Download, Upload, FileDown, FileUp, Printer, RefreshCw, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { toCSV, downloadCSV, downloadJSON, parseCSV, readFileAsText } from '@/lib/exporters';

interface DataToolbarProps<T> {
  data: T[];
  filename: string;
  headers?: { key: keyof T; label: string }[];
  onImport?: (rows: Record<string, string>[]) => void;
  onRefresh?: () => void;
}

export function DataToolbar<T extends Record<string, any>>({ data, filename, headers, onImport, onRefresh }: DataToolbarProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    if (data.length === 0) { toast.message('No data to export'); return; }
    downloadCSV(filename, toCSV(data, headers));
    toast.success(`Exported ${data.length} rows to ${filename}.csv`);
  };

  const handleExportJSON = () => {
    if (data.length === 0) { toast.message('No data to export'); return; }
    downloadJSON(filename, data);
    toast.success(`Exported ${data.length} rows to ${filename}.json`);
  };

  const handlePrint = () => {
    toast.message('Opening print preview…');
    setTimeout(() => window.print(), 300);
  };

  const handleImportClick = () => {
    if (!onImport) { toast.message('Import not supported here'); return; }
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = file.name.endsWith('.json') ? JSON.parse(text) : parseCSV(text);
      if (!Array.isArray(rows) || rows.length === 0) { toast.error('File contains no rows'); return; }
      onImport?.(rows);
      toast.success(`Imported ${rows.length} rows`);
    } catch {
      toast.error('Failed to parse file');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {onRefresh && (
        <Button variant="ghost" size="icon-sm" onClick={() => { onRefresh(); toast.success('Refreshed'); }} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      {onImport && (
        <Button variant="outline" size="sm" onClick={handleImportClick}>
          <Upload className="h-4 w-4" /> Import
        </Button>
      )}
      <input ref={inputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileChange} />
      <Dropdown
        trigger={
          <Button variant="outline" size="sm" type="button">
            <Download className="h-4 w-4" /> Export
            <MoreHorizontal className="h-3 w-3 opacity-50" />
          </Button>
        }
      >
        <DropdownItem onClick={handleExportCSV}><FileDown className="h-4 w-4" /> Export as CSV</DropdownItem>
        <DropdownItem onClick={handleExportJSON}><FileDown className="h-4 w-4" /> Export as JSON</DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={handlePrint}><Printer className="h-4 w-4" /> Print</DropdownItem>
      </Dropdown>
    </div>
  );
}

export function DataActionButtons({ onImport, onExport }: { onImport?: () => void; onExport?: () => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      {onImport && <Button variant="outline" size="sm" onClick={onImport}><FileUp className="h-4 w-4" /> Import</Button>}
      {onExport && <Button variant="outline" size="sm" onClick={onExport}><FileDown className="h-4 w-4" /> Export</Button>}
    </div>
  );
}
