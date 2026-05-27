import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => void;
  hasPermission: (page: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'pqas_auth_user';

// One demo account per role + an admin override
export const MOCK_ACCOUNTS = [
  { id: 'U-001', email: 'priya@pqas.com',    password: 'admin123',      name: 'Priya Sharma',   role: 'Admin',              roleId: 'ROLE-001', department: 'Engineering' },
  { id: 'U-002', email: 'arjun@pqas.com',    password: 'management123', name: 'Arjun Mehta',    role: 'Management',         roleId: 'ROLE-002', department: 'Engineering' },
  { id: 'U-003', email: 'suresh@pqas.com',   password: 'production123', name: 'Suresh Kumar',   role: 'Production Manager', roleId: 'ROLE-003', department: 'Production' },
  { id: 'U-004', email: 'kavitha@pqas.com',  password: 'stores123',     name: 'Kavitha Nair',   role: 'Stores Manager',     roleId: 'ROLE-004', department: 'Stores' },
  { id: 'U-005', email: 'deepa@pqas.com',    password: 'quality123',    name: 'Deepa Reddy',    role: 'Quality Manager',    roleId: 'ROLE-005', department: 'Quality Control' },
  { id: 'U-006', email: 'ravi@pqas.com',     password: 'inspector123',  name: 'Ravi Patel',     role: 'Inspector',          roleId: 'ROLE-006', department: 'Production' },
  { id: 'U-DEMO', email: 'demo@pqas.com',    password: 'demo',          name: 'Demo User',      role: 'Admin',              roleId: 'ROLE-001', department: 'Engineering' },
];

// Permission map: role → { page: { view/create/edit/delete } }
const PERMS: Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  Admin: new Proxy({}, { get: () => ({ view: true, create: true, edit: true, delete: true }) }),
  Management: new Proxy({}, { get: () => ({ view: true, create: false, edit: false, delete: false }) }),
  'Production Manager': new Proxy({}, {
    get: (_, p: string) => {
      const writeable = ['Products', 'Components', 'Manufacturing Stages', 'Assembling Stages'];
      return writeable.includes(p)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: true, create: false, edit: false, delete: false };
    },
  }),
  'Stores Manager': new Proxy({}, {
    get: (_, p: string) => {
      const writeable = ['Materials', 'Material Types', 'Suppliers'];
      return writeable.includes(p)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: true, create: false, edit: false, delete: false };
    },
  }),
  'Quality Manager': new Proxy({}, {
    get: (_, p: string) => {
      const writeable = ['Inspection Types', 'Equipment', 'Inspection Methods', 'Documents'];
      return writeable.includes(p)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: true, create: false, edit: false, delete: false };
    },
  }),
  Inspector: new Proxy({}, {
    get: (_, p: string) => {
      if (p === 'Equipment') return { view: true, create: false, edit: true, delete: false };
      return { view: true, create: false, edit: false, delete: false };
    },
  }),
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 700));
    const acc = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
    if (!acc) return { success: false, error: 'Invalid email or password' };
    setUser({ id: acc.id, name: acc.name, email: acc.email, role: acc.role });
    return { success: true };
  };

  const logout = () => setUser(null);
  const updateProfile = (data: Partial<AuthUser>) => setUser((u) => (u ? { ...u, ...data } : u));

  const hasPermission = (page: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view') => {
    if (!user) return false;
    const rolePerms = PERMS[user.role];
    if (!rolePerms) return false;
    const p = rolePerms[page];
    return !!p?.[action];
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfile, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
