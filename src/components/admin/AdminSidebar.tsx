import { NavLink } from 'react-router-dom';
import { ArrowUpRight, Briefcase, Code, FileText, HardDrive, Inbox, LayoutDashboard, LogOut, Mail, Moon, Settings, Shield, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';

const groups = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Control room', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/posts', label: 'Posts', icon: FileText },
      { href: '/admin/projects', label: 'Projects', icon: Code },
      { href: '/admin/experience', label: 'Experience', icon: Briefcase },
      { href: '/admin/messages', label: 'Messages', icon: Inbox },
    ],
  },
  {
    label: 'Site',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/files', label: 'Files', icon: HardDrive },
      { href: '/admin/security', label: 'Security', icon: Shield },
    ],
  },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
}

export function AdminSidebar({ onNavigate, onLogout, loggingOut }: AdminSidebarProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <NavLink to="/" className="font-display text-[1.75rem] leading-none tracking-[-0.02em] text-foreground">
          Ashish<span className="text-primary">.</span>
        </NavLink>
        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">control room</div>
      </div>
      <nav className="flex-1 space-y-7 overflow-y-auto px-3" aria-label="Admin">
        {groups.map(group => (
          <div key={group.label}>
            <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={'end' in item ? item.end : false}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={cn('absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-primary transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                        <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-border p-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
          <ArrowUpRight className="h-4 w-4" /> View site
        </a>
        <a href="/mail/inbox" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
          <Mail className="h-4 w-4" /> Mail
        </a>
        <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? 'Paper mode' : 'Ink mode'}
        </button>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}
