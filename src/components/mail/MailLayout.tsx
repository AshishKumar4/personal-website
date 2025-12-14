import React from 'react';
import { Outlet } from 'react-router-dom';
import { MailSidebar } from './MailSidebar';
import { Toaster } from '@/components/ui/sonner';
import { MailProvider } from '@/contexts/MailContext';

export function MailLayout() {
  return (
    <MailProvider>
      <div className="flex h-screen bg-background text-foreground">
        <MailSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
        <Toaster position="bottom-right" />
      </div>
    </MailProvider>
  );
}
