import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { ChartTooltip, BarGradient, chartGrid, chartAxisTick, chartAxisTickSm, chartAxisLine, chartLegendStyle, barCursor, lineCursor } from './ChartTooltip';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatsCard } from '@/components/shared/StatsCard';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExportButtons } from './ExportButtons';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useChartColors } from '@/lib/chartColors';
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
  const chart = useChartColors();
  const green = data.filter((r: any) => r.status === 'GREEN').length;
  const amber = data.filter((r: any) => r.status === 'AMBER').length;
  const red = data.filter((r: any) => r.status === 'RED').length;
  const total = data.length;

  const donut = [
    { name: 'Good',     value: green, color: chart.green },
    { name: 'Warning',  value: amber, color: chart.amber },
    { name: 'Critical', value: red,   color: chart.red },
  ].filter((d) => d.value > 0);

  const trend = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const day = data.filter((r: any) => r.date && r.date.startsWith(key));
      return {
        date: format(d, 'MMM dd'),
        Good:     day.filter((r: any) => r.status === 'GREEN').length,
        Warning:  day.filter((r: any) => r.status === 'AMBER').length,
        Critical: day.filter((r: any) => r.status === 'RED').length,
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
                    <defs>
                      <BarGradient id="qg-quality" color={chart.green} />
                      <BarGradient id="qg-delivery" color={chart.primary} />
                      <BarGradient id="qg-quantity" color={chart.gold} />
                    </defs>
                    <CartesianGrid {...chartGrid} vertical={false} />
                    <XAxis dataKey="name" tick={chartAxisTick} stroke={chartAxisLine} />
                    <YAxis tick={chartAxisTick} stroke={chartAxisLine} domain={[0, 10]} />
                    <RTip content={<ChartTooltip valueSuffix="/10" />} cursor={barCursor} />
                    <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                    <Bar dataKey="Quality"  fill="url(#qg-quality)"  radius={[4,4,0,0]} maxBarSize={40} />
                    <Bar dataKey="Delivery" fill="url(#qg-delivery)" radius={[4,4,0,0]} maxBarSize={40} />
                    <Bar dataKey="Quantity" fill="url(#qg-quantity)" radius={[4,4,0,0]} maxBarSize={40} />
                  </BarChart>
                ) : (
                  <LineChart data={trend}>
                    <CartesianGrid {...chartGrid} vertical={false} />
                    <XAxis dataKey="date" tick={chartAxisTickSm} stroke={chartAxisLine} interval={Math.ceil(trend.length / 8)} />
                    <YAxis tick={chartAxisTick} stroke={chartAxisLine} allowDecimals={false} />
                    <RTip content={<ChartTooltip />} cursor={lineCursor} />
                    <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
                    <Line type="monotone" dataKey="Good"     stroke={chart.green} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Warning"  stroke={chart.amber} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Critical" stroke={chart.red} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
                      <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} cornerRadius={6} stroke="hsl(var(--card))" strokeWidth={2}>
                        {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RTip content={<ChartTooltip hideLabel />} />
                      <Legend wrapperStyle={chartLegendStyle} iconType="circle" />
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
          <DateRangeFilter from={fromDate} to={toDate || ''} onChange={(f, t) => onDateChange?.(f, t)} />
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
