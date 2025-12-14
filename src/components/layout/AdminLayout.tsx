import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getToken, clearToken } from '@/lib/auth';
import { api } from '@/lib/api-client';
import { Toaster } from '@/components/ui/sonner';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';

export function AdminLayout() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

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
      // Ignore logout errors - we'll clear token regardless
    } finally {
      clearToken();
      toast.success('Logged out successfully');
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="admin-panel flex min-h-screen bg-background text-muted-foreground">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-end px-6 gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </Button>
        </header>
        <main className="flex-1 p-6 md:p-10 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" />
    </div>
  );
}
