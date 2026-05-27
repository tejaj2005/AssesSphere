import { BarChart3, Factory, Wrench, Layers, Truck } from 'lucide-react';
import type { NavGroup } from '@/components/layout/navConfig';

export const MANAGEMENT_NAV: NavGroup[] = [
  {
    label: 'Quality Dashboards',
    items: [
      { label: 'Product Quality',  icon: BarChart3, to: '/management/product-quality' },
      { label: 'Mfg. Stage',       icon: Factory,   to: '/management/manufacturing-quality' },
      { label: 'Asm. Stage',       icon: Wrench,    to: '/management/assembling-quality' },
      { label: 'Material',         icon: Layers,    to: '/management/material-quality' },
      { label: 'Supplier Eval',    icon: Truck,     to: '/management/supplier-evaluation' },
    ],
  },
];
