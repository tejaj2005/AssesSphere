import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExportButtons } from './ExportButtons';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { InspectionRecord } from '@/types';

export interface DashFilterDef {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface QualityDashboardPageProps<T> {
  title: string;
  description: string;
  data: T[];
  columns: Column<T>[];
  exportRows: Record<string, any>[];
  fileName: string;
  filters?: DashFilterDef[];
  filterState?: Record<string, string>;
  onFilterChange?: (k: string, v: string) => void;
  fromDate?: string;
  toDate?: string;
  onDateChange?: (from: string, to: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  chartType?: 'trend' | 'comparison';
  comparisonData?: any[];
  onRowClick?: (row: T) => void;
  extraSlot?: ReactNode;
}

export function QualityDashboardPage<T extends { id: string; status?: any; date?: string }>({
  title, description, data, columns, exportRows, fileName,
  filters = [], filterState = {}, onFilterChange,
  fromDate, toDate, onDateChange,
  search, onSearchChange,
  chartType = 'trend', comparisonData, onRowClick, extraSlot,
}: QualityDashboardPageProps<T>) {
  const green = data.filter((r: any) => r.status === 'GREEN').length;
  const amber = data.filter((r: any) => r.status === 'AMBER').length;
  const red = data.filter((r: any) => r.status === 'RED').length;
  const total = data.length;

  const donut = [
    { name: 'Good',     value: green, color: '#2e9e6b' },
    { name: 'Warning',  value: amber, color: '#f5af12' },
    { name: 'Critical', value: red,   color: '#d9534f' },
  ].filter((d) => d.value > 0);

  const trend = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const day = data.filter((r: any) => r.date && r.date.startsWith(key));
      return {
        date: format(d, 'MMM dd'),
        green: day.filter((r: any) => r.status === 'GREEN').length,
        amber: day.filter((r: any) => r.status === 'AMBER').length,
        red:   day.filter((r: any) => r.status === 'RED').length,
      };
    });
  }, [data]);

  return (
    <PageWrapper>
      <PageHeader title={title} description={description} action={<ExportButtons data={exportRows} fileName={fileName} />} />

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div variants={staggerItem}><StatsCard label="Total Inspections" value={total} icon={Package} /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Good" value={green} icon={CheckCircle2} variant="success" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Warning" value={amber} icon={AlertTriangle} variant="warning" /></motion.div>
        <motion.div variants={staggerItem}><StatsCard label="Critical" value={red} icon={XCircle} variant="danger" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{chartType === 'comparison' ? 'Supplier Ratings Comparison' : 'Inspection Trend (30 days)'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'comparison' && comparisonData ? (
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 10]} />
                    <RTip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Quality"  fill="#22c55e" radius={[4,4,0,0]} />
                    <Bar dataKey="Delivery" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="Quantity" fill="#a855f7" radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={Math.ceil(trend.length / 8)} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="green" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="amber" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="red"   stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72 relative">
              {donut.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                        {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RTip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-[-30px]">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{total}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {extraSlot}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {onSearchChange && <SearchInput value={search || ''} onChange={onSearchChange} placeholder="Search…" className="sm:w-72" />}
        {fromDate !== undefined && (
          <div className="flex items-center gap-2">
            <Input type="date" value={fromDate} onChange={(e) => onDateChange?.(e.target.value, toDate || '')} className="w-40" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={toDate} onChange={(e) => onDateChange?.(fromDate, e.target.value)} className="w-40" />
          </div>
        )}
        {filters.map((f) => (
          <Select key={f.key} value={filterState[f.key] || 'all'} onChange={(v) => onFilterChange?.(f.key, v)} options={[{ label: `All ${f.label}`, value: 'all' }, ...f.options]} className="w-40" />
        ))}
      </div>

      <div className="print-area">
        <DataTable columns={columns} data={data} onRowClick={onRowClick} emptyTitle="No inspection data" emptyDescription="No records match the current filters." />
      </div>
    </PageWrapper>
  );
}
