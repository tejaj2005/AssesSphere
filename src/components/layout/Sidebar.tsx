import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Circle, ChevronRight } from 'lucide-react';
import { NAV } from './navConfig';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { AssessSphereLogoWhite } from '@/components/AssessSphereLogo';
import { sidebarText } from '@/lib/animations';
import { cn, formatRole } from '@/lib/utils';

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user, hasPermission } = useAuth();
  const visibleNav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permKey || hasPermission(i.permKey)) })).filter((g) => g.items.length > 0);

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex sticky top-0 h-screen flex-col bg-[#0a3d4d] text-white/70 border-r border-white/5 overflow-hidden shrink-0"
    >
      {/* ─── HEADER (centered, 16px padding) ─── */}
      <div className={cn('flex h-16 items-center border-b border-white/5 shrink-0 transition-all', collapsed ? 'px-3 justify-center' : 'px-4 gap-3')}>
        {!collapsed ? (
          <>
            <AssessSphereLogoWhite size={36} />
            <motion.div variants={sidebarText} animate="expanded" initial="expanded" className="flex-1 min-w-0">
              <p className="text-[15px] font-extrabold italic truncate tracking-tight leading-tight">
                <span className="text-white">Assess</span><span className="text-[#f5af12]">Sphere</span>
              </p>
              <p className="text-[9px] text-white/50 tracking-[0.05em] font-medium leading-tight mt-0.5">Powered by QMICS</p>
            </motion.div>
            <Tooltip content="Collapse sidebar (⌘B)" side="right">
              <button
                onClick={onToggle}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <Tooltip content="Expand sidebar (⌘B)" side="right">
            <button onClick={onToggle} className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-white/10 transition-colors group" aria-label="Expand sidebar">
              <AssessSphereLogoWhite size={28} className="group-hover:hidden" />
              <PanelLeftOpen className="h-5 w-5 text-white hidden group-hover:block" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* ─── NAV ─── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {visibleNav.map((group, gi) => (
          <div key={gi} className={cn('mb-4', collapsed ? 'px-2' : 'px-3')}>
            {group.label && !collapsed && (
              <p className="px-3 mt-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 truncate">{group.label}</p>
            )}
            {group.label && collapsed && gi > 0 && <div className="my-3 h-px bg-white/10 mx-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const link = (
                  <NavLink to={item.to} end={item.to === '/admin'}
                    className={({ isActive }) => cn(
                      'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
                      collapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-9 px-3 gap-3',
                      isActive
                        ? 'bg-[#f5af12] text-[#0a3d4d] font-semibold'
                        : 'text-white/65 hover:bg-white/8 hover:text-white'
                    )}>
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <motion.span
                            layoutId="nav-active-pill"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#0a3d4d]"
                            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                          />
                        )}
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span variants={sidebarText} initial="collapsed" animate="expanded" exit="collapsed" className="truncate">
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </NavLink>
                );
                return collapsed ? <Tooltip key={item.to} content={item.label} side="right">{link}</Tooltip> : <div key={item.to}>{link}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── FOOTER ─── */}
      <div className={cn('border-t border-white/5 shrink-0', collapsed ? 'p-2' : 'p-3')}>
        <NavLink to="/admin/profile" className={({ isActive }) => cn(
          'group flex items-center rounded-lg transition-colors',
          collapsed ? 'h-11 w-11 justify-center mx-auto' : 'gap-3 px-2 py-2',
          isActive ? 'bg-white/10' : 'hover:bg-white/8'
        )}>
          <Avatar name={user?.name || 'User'} src={user?.avatar} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div variants={sidebarText} initial="collapsed" animate="expanded" exit="collapsed" className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] text-white/50 flex items-center gap-1 leading-tight mt-0.5">
                  <Circle className="h-1.5 w-1.5 fill-[#2e9e6b] text-[#2e9e6b]" /> {formatRole(user?.role)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && <ChevronRight className="h-3 w-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </NavLink>
      </div>
    </motion.aside>
  );
};
