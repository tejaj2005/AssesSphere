import { LayoutDashboard, ClipboardList, FileCheck, Star, CheckCircle2, Package, BarChart3, Factory } from 'lucide-react';
import type { NavGroup } from '@/components/layout/navConfig';

export const SM_NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/sm/dashboard' }] },
  {
    label: 'Material Inspection',
    items: [
      { label: 'Material Plans',  icon: ClipboardList, to: '/sm/material-plans' },
      { label: 'Review Reports',  icon: FileCheck,     to: '/sm/review-material-reports' },
    ],
  },
  {
    label: 'Supplier Management',
    items: [
      { label: 'Evaluations',    icon: Star,         to: '/sm/supplier-evaluations' },
      { label: 'Approved Vendors', icon: CheckCircle2, to: '/sm/approved-vendors' },
    ],
  },
  { label: 'Inventory', items: [{ label: 'Stock Statement', icon: Package, to: '/sm/stock-statement' }] },
  {
    label: 'Dashboards',
    items: [
      { label: 'Material Quality',     icon: BarChart3, to: '/sm/material-quality' },
      { label: 'Supplier Performance', icon: Factory,   to: '/sm/supplier-performance' },
    ],
  },
];
