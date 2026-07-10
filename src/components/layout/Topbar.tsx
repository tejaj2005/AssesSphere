import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut, ChevronRight, Search, Bell, Home, User as UserIcon, Settings as Cog, Maximize2, Minimize2, Check, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatRole } from '@/lib/utils';
import { NAV } from './navConfig';
import type { NavGroup } from './navConfig';

const findLabel = (pathname: string, groups: NavGroup[]) => {
  for (const g of groups) for (const i of g.items) if (i.to === pathname) return i.label;
  if (pathname.startsWith('/admin/products/')) return 'Product Detail';
  return 'Page';
};

interface TopbarProps {
  onMenuClick: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  /** Set by ModuleLayout so the breadcrumb reflects the actual module instead of always "Admin". */
  moduleName?: string;
  groups?: NavGroup[];
}

export const Topbar = ({ onMenuClick, onSidebarToggle, sidebarCollapsed, moduleName, groups }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const label = findLabel(location.pathname, groups ?? NAV);
  const isDashboard = label === 'Dashboard';
  const [fullscreen, setFullscreen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const notifications = [
    { id: 1, title: 'Calibration due soon', desc: 'Micrometer MC-11 needs calibration in 2 days', time: '2h ago', icon: '⚠️' },
    { id: 2, title: 'New supplier added', desc: 'PackRight Industries was added by Kavitha Nair', time: '5h ago', icon: '🏭' },
    { id: 3, title: 'Product updated', desc: 'GearBox Assembly GX-200 specifications updated', time: '1d ago', icon: '📦' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 flex items-center px-4 sm:px-6 gap-2">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md hover:bg-muted">
        <Menu className="h-5 w-5" />
      </button>

      {onSidebarToggle && (
        <button
          onClick={onSidebarToggle}
          className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={`${sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar (⌘B)`}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      )}

      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Link to={moduleName ? '/app' : '/admin'} className="text-muted-foreground hover:text-foreground transition-colors">
          {moduleName ?? 'Admin'}
        </Link>
        {!isDashboard && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground truncate">{label}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setCmdOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/50 text-sm text-muted-foreground w-64 hover:border-accent/40 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Quick search…</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">⌘K</kbd>
      </button>

      <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="hidden md:inline-flex">
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>

      <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.div>
        </AnimatePresence>
      </Button>

      <Dropdown
        trigger={
          <button className="relative p-2 rounded-md hover:bg-muted">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {!notifRead && <Badge variant="danger" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] py-0">{notifications.length}</Badge>}
          </button>
        }
        className="!w-80"
      >
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Notifications</p>
          <button onClick={() => setNotifRead(true)} className="text-xs text-accent hover:underline disabled:opacity-40" disabled={notifRead}>Mark all read</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <button key={n.id} className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted text-left transition-colors">
              <span className="text-lg shrink-0">{n.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.desc}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
              </div>
              {!notifRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />}
            </button>
          ))}
        </div>
        <DropdownSeparator />
        <DropdownItem onClick={() => navigate('/admin')}>View all activity</DropdownItem>
      </Dropdown>

      <Dropdown
        trigger={
          <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
            <Avatar name={user?.name || 'U'} src={user?.avatar} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium leading-tight">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatRole(user?.role)}</p>
            </div>
          </button>
        }
      >
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <Badge variant="accent" className="mt-1.5 text-[10px]">{formatRole(user?.role)}</Badge>
        </div>
        <DropdownItem onClick={() => navigate('/admin/profile')}><UserIcon className="h-4 w-4" /> Profile</DropdownItem>
        <DropdownItem onClick={() => navigate('/admin/settings')}><Cog className="h-4 w-4" /> Settings</DropdownItem>
        <DropdownItem onClick={() => navigate('/')}><Home className="h-4 w-4" /> Home</DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          <Check className="ml-auto h-3 w-3 opacity-0" />
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onClick={handleLogout}><LogOut className="h-4 w-4" /> Sign Out</DropdownItem>
      </Dropdown>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </header>
  );
};
