import {
  LayoutDashboard, Building2, Building, Users, Shield, Package, Puzzle, Settings,
  Wrench, ClipboardList, Microscope, FlaskConical, FileText, Layers, FolderOpen,
  Factory, User, Cog, type LucideIcon,
} from 'lucide-react';

export interface NavItem { label: string; icon: LucideIcon; to: string; permKey?: string; }
export interface NavGroup { label?: string; items: NavItem[]; }

export const NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, to: '/admin', permKey: 'Dashboard' }] },
  {
    label: 'Organization Setup',
    items: [
      { label: 'Organization', icon: Building2, to: '/admin/organization', permKey: 'Organization' },
      { label: 'Departments',   icon: Building,  to: '/admin/departments',  permKey: 'Departments' },
      { label: 'Users',         icon: Users,     to: '/admin/users',        permKey: 'Users' },
      { label: 'Roles',         icon: Shield,    to: '/admin/roles',        permKey: 'Roles' },
    ],
  },
  {
    label: 'Product Configuration',
    items: [
      { label: 'Products',     icon: Package,  to: '/admin/products',              permKey: 'Products' },
      { label: 'Components',   icon: Puzzle,   to: '/admin/components',            permKey: 'Components' },
      { label: 'Mfg. Stages',  icon: Settings, to: '/admin/manufacturing-stages',  permKey: 'Manufacturing Stages' },
      { label: 'Asm. Stages',  icon: Wrench,   to: '/admin/assembling-stages',     permKey: 'Assembling Stages' },
    ],
  },
  {
    label: 'Inspection Configuration',
    items: [
      { label: 'Insp. Types', icon: ClipboardList, to: '/admin/inspection-types',   permKey: 'Inspection Types' },
      { label: 'Equipment',   icon: Microscope,    to: '/admin/equipment',          permKey: 'Equipment' },
      { label: 'Methods',     icon: FlaskConical,  to: '/admin/inspection-methods', permKey: 'Inspection Methods' },
    ],
  },
  {
    label: 'Document Management',
    items: [{ label: 'Documents', icon: FileText, to: '/admin/documents', permKey: 'Documents' }],
  },
  {
    label: 'Material & Supplier',
    items: [
      { label: 'Materials',      icon: Layers,     to: '/admin/materials',      permKey: 'Materials' },
      { label: 'Material Types', icon: FolderOpen, to: '/admin/material-types', permKey: 'Material Types' },
      { label: 'Suppliers',      icon: Factory,    to: '/admin/suppliers',      permKey: 'Suppliers' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile',  icon: User, to: '/admin/profile' },
      { label: 'Settings', icon: Cog,  to: '/admin/settings' },
    ],
  },
];
