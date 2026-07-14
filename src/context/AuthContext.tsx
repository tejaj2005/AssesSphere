import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { api, setToken, clearToken, getToken, setUnauthorizedHandler } from '@/lib/api';

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

/** Seeded demo accounts (see server/seed.ts) — one per backend role. */
export const DEMO_ACCOUNTS = [
  { email: 'admin@qmics.com',      password: 'Admin@2025', name: 'System Admin',        role: 'Admin' },
  { email: 'management@qmics.com', password: 'Mgmt@2025',  name: 'Management Director', role: 'Management' },
  { email: 'production@qmics.com', password: 'Prod@2025',  name: 'Production Manager',  role: 'ProductionManager' },
  { email: 'stores@qmics.com',     password: 'Store@2025', name: 'Stores Manager',      role: 'StoresManager' },
  { email: 'quality@qmics.com',    password: 'Qual@2025',  name: 'Quality Manager',     role: 'QualityManager' },
  { email: 'inspector@qmics.com',  password: 'Insp@2025',  name: 'Inspector Ravi',      role: 'Inspector' },
];

type PagePermission = { view: boolean; create: boolean; edit: boolean; delete: boolean };

/** Permission map: role → { page: {view/create/edit/delete} }. Role names match server/models/User.ts's enum exactly. */
const PERMS: Record<string, Record<string, PagePermission>> = {
  Admin: new Proxy({}, { get: () => ({ view: true, create: true, edit: true, delete: true }) }),
  Management: new Proxy({}, { get: () => ({ view: true, create: false, edit: false, delete: false }) }),
  ProductionManager: new Proxy({}, {
    get: (_, p: string) => {
      const writeable = ['Products', 'Components', 'Manufacturing Stages', 'Assembling Stages'];
      return writeable.includes(p)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: true, create: false, edit: false, delete: false };
    },
  }),
  StoresManager: new Proxy({}, {
    get: (_, p: string) => {
      const writeable = ['Materials', 'Material Types', 'Suppliers'];
      return writeable.includes(p)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: true, create: false, edit: false, delete: false };
    },
  }),
  QualityManager: new Proxy({}, {
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

function mapAuthUser(raw: any): AuthUser {
  return {
    id: raw._id ?? raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    organization: typeof raw.organization === 'string' ? raw.organization : raw.organization?._id,
    phone: raw.phone,
    address: raw.address,
    bio: raw.bio,
  };
}

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

  // If a token exists but we haven't confirmed it's still valid, re-sync with the server.
  useEffect(() => {
    if (!getToken() || !user) return;
    api.get<any>('/auth/me')
      .then((raw) => {
        // Guard against a logout that happened while this request was in flight — without
        // this, a slow /auth/me response can silently re-authenticate a user who already
        // signed out, since the server still honors a token cleared only on the client.
        if (getToken()) setUser(mapAuthUser(raw));
      })
      .catch(() => { clearToken(); setUser(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registered once for the lifetime of the app: any request that comes back 401 (expired or
  // invalidated token) logs the user out immediately instead of leaving the SPA in a "phantom
  // logged-in" state where every subsequent call just fails silently.
  useEffect(() => {
    setUnauthorizedHandler(() => { clearToken(); setUser(null); });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { token, user: rawUser } = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
      setToken(token);
      setUser(mapAuthUser(rawUser));
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Login failed' };
    }
  };

  const logout = () => { clearToken(); setUser(null); };

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
