import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, Circle, ChevronRight } from 'lucide-react';
import { NAV } from './navConfig';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { AssessSphereLogoWhite } from '@/components/AssessSphereLogo';
import { sidebarText } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user, hasPermission } = useAuth();
  const visibleNav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permKey || hasPermission(i.permKey)) })).filter((g) => g.items.length > 0);

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:flex sticky top-0 h-screen flex-col bg-[#0B1120] text-[#7B8CA6] border-r border-[#1E2D45] overflow-hidden shrink-0"
    >
      {/* ─── HEADER ─── */}
      <div className={cn('flex h-16 items-center border-b border-[#1E2D45] shrink-0 transition-all', collapsed ? 'px-3 justify-center' : 'px-4 gap-3')}>
        {!collapsed ? (
          <>
            <AssessSphereLogoWhite size={36} />
            <motion.div variants={sidebarText} animate="expanded" initial="expanded" className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate tracking-tight leading-tight">AssessSphere</p>
              <p className="text-[9px] text-amber-400/80 uppercase tracking-[0.18em] font-semibold leading-tight mt-0.5">Admin</p>
            </motion.div>
            <Tooltip content="Collapse sidebar (⌘B)" side="right">
              <button
                onClick={onToggle}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#7B8CA6] hover:text-white hover:bg-[#131C2E] transition-colors shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <Tooltip content="Expand sidebar (⌘B)" side="right">
            <button
              onClick={onToggle}
              className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-[#131C2E] transition-colors group"
              aria-label="Expand sidebar"
            >
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
              <p className="px-3 mt-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7B8CA6]/70 truncate">
                {group.label}
              </p>
            )}
            {group.label && collapsed && gi > 0 && <div className="my-3 h-px bg-[#1E2D45] mx-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const link = (
                  <NavLink to={item.to} end={item.to === '/admin'}
                    className={({ isActive }) => cn(
                      'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
                      collapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-9 px-3 gap-3',
                      isActive
                        ? 'bg-[#1A2744] text-white'
                        : 'text-[#7B8CA6] hover:bg-[#131C2E] hover:text-[#B8C5D6]'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <motion.span
                            layoutId="nav-active-pill"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#3B82F6]"
                            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                          />
                        )}
                        {isActive && collapsed && (
                          <motion.span layoutId="nav-active-pill" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#3B82F6]" />
                        )}
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              variants={sidebarText}
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              className="truncate"
                            >
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
      <div className={cn('border-t border-[#1E2D45] shrink-0', collapsed ? 'p-2' : 'p-3')}>
        <NavLink
          to="/admin/profile"
          className={({ isActive }) => cn(
            'group flex items-center rounded-lg transition-colors',
            collapsed ? 'h-11 w-11 justify-center mx-auto' : 'gap-3 px-2 py-2',
            isActive ? 'bg-[#1A2744]' : 'hover:bg-[#131C2E]'
          )}
        >
          <Avatar name={user?.name || 'User'} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div variants={sidebarText} initial="collapsed" animate="expanded" exit="collapsed" className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] text-[#7B8CA6] flex items-center gap-1 leading-tight mt-0.5">
                  <Circle className="h-1.5 w-1.5 fill-[#10B981] text-[#10B981]" /> {user?.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && <ChevronRight className="h-3 w-3 text-[#7B8CA6] opacity-0 group-hover:opacity-100 transition-opacity" />}
        </NavLink>
      </div>
    </motion.aside>
  );
};
