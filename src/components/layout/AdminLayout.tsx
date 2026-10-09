import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getToken, clearToken } from '@/lib/auth';
import { api } from '@/lib/api-client';
import { Toaster } from '@/components/ui/sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useDocumentTheme, useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';

const TITLES: Record<string, string> = {
  '/admin': 'control room',
  '/admin/posts': 'posts',
  '/admin/projects': 'projects',
  '/admin/experience': 'experience',
  '/admin/messages': 'messages',
  '/admin/settings': 'settings',
  '/admin/files': 'files',
  '/admin/security': 'security',
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  useDocumentTheme(isDark);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const token = getToken();
    try {
      await api('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setLoggingOut(false);
    } finally {
      clearToken();
      toast.success('Logged out');
      navigate('/admin/login', { replace: true });
    }
  };

  const crumb = TITLES[location.pathname] ?? location.pathname.replace('/admin/', '').split('/')[0];

  return (
    <div className="admin-panel flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card/40 lg:block">
        <AdminSidebar onLogout={handleLogout} loggingOut={loggingOut} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} loggingOut={loggingOut} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              admin <span className="text-muted-foreground/50">/</span> <span className="text-foreground">{crumb}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> session active
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-10 md:py-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" />
    </div>
  );
}
