import { FileDown, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportToPdf } from '@/lib/exportExcel';

export const ExportButtons = ({ data, fileName }: { data: Record<string, any>[]; fileName: string }) => (
  <div className="inline-flex gap-2 no-print">
    <Button variant="outline" size="sm" onClick={() => {
      if (data.length === 0) { toast.message('Nothing to export'); return; }
      exportToExcel(data, fileName);
      toast.success(`Exported ${data.length} rows to Excel`);
    }}>
      <FileDown className="h-4 w-4" /> Excel
    </Button>
    <Button variant="outline" size="sm" onClick={() => { toast.message('Opening print dialog…'); setTimeout(() => exportToPdf(), 200); }}>
      <Printer className="h-4 w-4" /> PDF
    </Button>
  </div>
);
