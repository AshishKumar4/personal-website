import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Mail } from 'lucide-react';
import { MailSidebar } from './MailSidebar';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MailProvider } from '@/contexts/MailContext';

export function MailLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <MailProvider>
      <div className="flex flex-col md:flex-row h-screen bg-background text-foreground">
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open mail menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MailSidebar />
            </SheetContent>
          </Sheet>
          <Link to="/mail/inbox" className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-bold">Mail</span>
          </Link>
        </div>

        <div className="hidden md:flex h-full">
          <MailSidebar />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
        <Toaster position="bottom-right" />
      </div>
    </MailProvider>
  );
}
