import { LayoutDashboard, ClipboardList, Wrench, Layers, Puzzle, Factory, FileCheck, ClipboardCheck } from 'lucide-react';
import type { NavGroup } from '@/components/layout/navConfig';

export const PM_NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/pm/dashboard' }] },
  {
    label: 'Production',
    items: [{ label: 'Production Plans', icon: Factory, to: '/pm/production-plans' }],
  },
  {
    label: 'Inspection Plans',
    items: [
      { label: 'Mfg. Plans',     icon: ClipboardList, to: '/pm/mfg-plans' },
      { label: 'Asm. Plans',     icon: Wrench,        to: '/pm/asm-plans' },
      { label: 'Material Plans', icon: Layers,        to: '/pm/mat-plans' },
      { label: 'Comp. Plans',    icon: Puzzle,        to: '/pm/comp-plans' },
    ],
  },
  {
    label: 'Review',
    items: [
      { label: 'Review Reports', icon: FileCheck,      to: '/pm/review-reports' },
      { label: 'Quality Plan',   icon: ClipboardCheck, to: '/pm/quality-plan-review' },
    ],
  },
];
