import { LayoutDashboard, ClipboardList, FileEdit, Users, FlaskConical, FileCheck, BarChart3, Factory, Wrench, Layers, Puzzle, Truck, Sparkles } from 'lucide-react';
import type { NavGroup } from '@/components/layout/navConfig';

export const QM_NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/qm/dashboard' }] },
  {
    label: 'Quality Planning',
    items: [
      { label: 'Quality Plans', icon: ClipboardList, to: '/qm/quality-plans' },
      { label: 'Checklists',    icon: FileEdit,      to: '/qm/checklists' },
    ],
  },
  { label: 'Assignments', items: [{ label: 'Assign Inspectors', icon: Users, to: '/qm/assign-inspectors' }] },
  {
    label: 'Approvals',
    items: [
      { label: 'Calibrations',  icon: FlaskConical, to: '/qm/calibration-approvals' },
      { label: 'Review Reports', icon: FileCheck,   to: '/qm/review-reports' },
    ],
  },
  { label: 'AI Tools', items: [
    { label: 'AI Gap Analysis', icon: Sparkles, to: '/qm/ai-gap-analysis' },
    { label: 'AI Assistant', icon: Sparkles, to: '/qm/ai-assistant' },
  ] },
  {
    label: 'Dashboards',
    items: [
      { label: 'Product Quality',  icon: BarChart3, to: '/qm/product-quality' },
      { label: 'Mfg Quality',      icon: Factory,   to: '/qm/mfg-quality' },
      { label: 'Asm Quality',      icon: Wrench,    to: '/qm/asm-quality' },
      { label: 'Material Quality', icon: Layers,    to: '/qm/material-quality' },
      { label: 'Component Quality', icon: Puzzle,   to: '/qm/component-quality' },
      { label: 'Supplier Perf.',   icon: Truck,     to: '/qm/supplier-performance' },
    ],
  },
];
