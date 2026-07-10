import { useState, useEffect, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ModuleSidebar } from '@/components/layout/ModuleSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Sheet } from '@/components/ui/sheet';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { Circle } from 'lucide-react';
import { AssessSphereLogoWhite } from '@/components/AssessSphereLogo';
import { GlobalCopilotButton } from '@/components/ai/GlobalCopilotButton';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/components/layout/navConfig';

interface ModuleLayoutProps {
  moduleName: string;
  groups: NavGroup[];
  profileLink?: string;
}

export const ModuleLayout = ({ moduleName, groups, profileLink }: ModuleLayoutProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem(`pqas_sb_${moduleName}`);
      if (v != null) return v === '1';
    } catch {}
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => { try { localStorage.setItem(`pqas_sb_${moduleName}`, collapsed ? '1' : '0'); } catch {} }, [collapsed, moduleName]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <ModuleSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} groups={groups} moduleName={moduleName} profileLink={profileLink} />

      <Sheet open={mobileOpen} onOpenChange={(o) => !o && setMobileOpen(false)} side="left" className="!bg-sidebar text-slate-300 w-72">
        <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-800 shrink-0">
          <AssessSphereLogoWhite size={36} />
          <div>
            <p className="text-sm font-bold text-white">AssessSphere</p>
            <p className="text-[9px] text-amber-400/80 uppercase tracking-[0.18em] font-semibold">{moduleName}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-4 px-3">
              {group.label && <p className="px-3 mt-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">{group.label}</p>}
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100')}>
                  <item.icon className="h-4 w-4 shrink-0" /> {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name || ''} src={user?.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1"><Circle className="h-1.5 w-1.5 fill-success text-success" />{user?.role}</p>
            </div>
          </div>
        </div>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onSidebarToggle={() => setCollapsed((c) => !c)}
          sidebarCollapsed={collapsed}
          moduleName={moduleName}
          groups={groups}
        />
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait"><div key={location.pathname}><Outlet /></div></AnimatePresence>
        </main>
      </div>

      <GlobalCopilotButton systemContext={{ userRole: user?.role || moduleName }} />
    </div>
  );
};
