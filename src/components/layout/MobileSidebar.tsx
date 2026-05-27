import { NavLink } from 'react-router-dom';
import { Sheet } from '@/components/ui/sheet';
import { NAV } from './navConfig';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { Circle } from 'lucide-react';
import { AssessSphereLogoWhite } from '@/components/AssessSphereLogo';
import { cn } from '@/lib/utils';

export const MobileSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} side="left" className="!bg-sidebar text-slate-300 w-72">
      <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-800 shrink-0">
        <AssessSphereLogoWhite size={36} />
        <div>
          <p className="text-sm font-bold text-white">AssessSphere</p>
          <p className="text-[9px] text-amber-400/80 uppercase tracking-[0.18em] font-semibold">Admin Module</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((group, gi) => (
          <div key={gi} className="mb-4 px-3">
            {group.label && <p className="px-3 mt-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-500">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100')
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" /> {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name || ''} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Circle className="h-1.5 w-1.5 fill-success text-success" />{user?.role} • Online
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
