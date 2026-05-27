import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'Data') {
  if (data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function exportToPdf() {
  window.print();
}
