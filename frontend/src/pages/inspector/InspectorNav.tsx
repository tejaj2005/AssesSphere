import { LayoutDashboard, Layers, Puzzle, Wrench, Package, FlaskConical } from 'lucide-react';
import type { NavGroup } from '@/components/layout/navConfig';

export const INSPECTOR_NAV: NavGroup[] = [
  { items: [{ label: 'My Dashboard', icon: LayoutDashboard, to: '/inspector/dashboard' }] },
  {
    label: 'My Reports',
    items: [
      { label: 'Material',       icon: Layers,       to: '/inspector/material-reports' },
      { label: 'Component',      icon: Puzzle,       to: '/inspector/component-reports' },
      { label: 'Assembly',       icon: Wrench,       to: '/inspector/assembly-reports' },
      { label: 'Final Product',  icon: Package,      to: '/inspector/final-product-reports' },
      { label: 'Calibration',    icon: FlaskConical, to: '/inspector/calibration-report' },
    ],
  },
];
