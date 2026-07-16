import { useTheme } from '@/context/ThemeContext';

/**
 * Theme-aware chart palette for recharts series.
 * Status hues (green/amber/red) read well on both light and dark cards, so
 * they stay constant. The brand teal is very dark and disappears on dark
 * surfaces, so it is lightened to a mid azure in dark mode.
 */
export interface ChartColors {
  green: string;
  amber: string;
  red: string;
  /** Brand primary used for bars/lines on card surfaces */
  primary: string;
  /** Darkest brand shade — lightened in dark mode */
  primaryDark: string;
  azure: string;
  gold: string;
  goldHover: string;
  grey: string;
  /** Ordered palette for categorical series (e.g. users-by-role) */
  series: string[];
}

export const useChartColors = (): ChartColors => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  // Dark-mode series are deliberately lighter/more saturated so they stay
  // vivid against the very dark teal card (--card: 195 50% 12%).
  const primary = dark ? '#4fb0cb' : '#0e5467';
  const primaryDark = dark ? '#82c7d6' : '#0a3d4d';
  const azure = dark ? '#5fc6e0' : '#2d8aa4';
  const gold = dark ? '#fbc63a' : '#f5af12';
  const goldHover = dark ? '#ffd566' : '#dc9c0c';
  const grey = dark ? '#a7b7c9' : '#64748b';
  return {
    green: dark ? '#3ccb8f' : '#2e9e6b',
    amber: gold,
    red: dark ? '#f0817d' : '#d9534f',
    primary,
    primaryDark,
    azure,
    gold,
    goldHover,
    grey,
    series: [primaryDark, primary, azure, dark ? '#34b27e' : '#2e9e6b', gold, goldHover],
  };
};
