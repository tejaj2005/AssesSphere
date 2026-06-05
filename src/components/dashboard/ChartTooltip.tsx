/**
 * Theme-aware Recharts helpers.
 *
 * Recharts' default tooltip renders item text in a hard-coded dark colour, so
 * on a dark card the values become unreadable (e.g. "Completed : 8" in near
 * black). This custom tooltip paints everything with semantic tokens
 * (popover / foreground / muted-foreground) so contrast is correct in both
 * themes, and shows a colour swatch per series for quicker reading.
 *
 * The exported style constants keep axes, grids, legends and cursors
 * consistent across every chart in the app.
 */

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string | number;
  unit?: string;
  payload?: Record<string, any>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Appended to every value, e.g. "/10" or "%". */
  valueSuffix?: string;
  /** Hide the header label row (useful for single-slice pie tooltips). */
  hideLabel?: boolean;
  /** Custom value renderer. */
  formatter?: (value: number | string | undefined, entry: TooltipEntry) => string;
}

const swatchColor = (entry: TooltipEntry) =>
  entry.color || entry.payload?.fill || entry.payload?.color || entry.fill || 'hsl(var(--accent))';

export const ChartTooltip = ({ active, payload, label, valueSuffix = '', hideLabel, formatter }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-lg shadow-black/10 min-w-[8rem]">
      {!hideLabel && label != null && label !== '' && (
        <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const value = formatter ? formatter(entry.value, entry) : `${entry.value ?? '—'}${valueSuffix}`;
          return (
            <div key={i} className="flex items-center gap-2 text-xs leading-none">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: swatchColor(entry) }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---- Shared chart styling (semantic tokens => correct in light & dark) ---- */

export const chartGrid = { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' } as const;
export const chartAxisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;
export const chartAxisTickSm = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } as const;
export const chartAxisLine = 'hsl(var(--border))';
export const chartLegendStyle = { fontSize: 12, paddingTop: 8 } as const;
export const barCursor = { fill: 'hsl(var(--muted))', opacity: 0.35 } as const;
export const lineCursor = { stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '4 4' } as const;

/**
 * Vertical bar gradient: brighter at the top, fading toward the baseline.
 * Render <BarGradient id="x" color={chart.green} /> inside <defs>, then set the
 * bar's fill to `url(#x)`.
 */
export const BarGradient = ({ id, color }: { id: string; color: string }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={0.95} />
    <stop offset="100%" stopColor={color} stopOpacity={0.55} />
  </linearGradient>
);
