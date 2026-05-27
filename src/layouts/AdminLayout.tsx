import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';

export const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('pqas_sidebar_collapsed');
      if (stored != null) return stored === '1';
    } catch {}
    return false; // default expanded
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try { localStorage.setItem('pqas_sidebar_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  // Keyboard shortcut: ⌘B / Ctrl+B to toggle sidebar
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

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} onSidebarToggle={() => setCollapsed((c) => !c)} sidebarCollapsed={collapsed} />
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <div key={location.pathname}>
              <Outlet />
            </div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
