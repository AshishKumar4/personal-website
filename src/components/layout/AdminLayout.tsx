import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getToken } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
export function AdminLayout() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);
  return (
    <div className="flex min-h-screen bg-dark-navy text-slate">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}