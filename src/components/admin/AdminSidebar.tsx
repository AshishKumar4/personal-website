import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FileText, Settings, Shield, LogOut, Home, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
const navItems = [
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/experience', label: 'Experience', icon: Briefcase },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/security', label: 'Security', icon: Shield },
];
export function AdminSidebar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    clearToken();
    navigate('/admin/login');
  };
  const baseLinkClass = "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors";
  const inactiveLinkClass = "text-slate hover:bg-light-navy hover:text-lightest-slate";
  const activeLinkClass = "bg-lightest-navy text-green";
  return (
    <aside className="w-64 flex-shrink-0 bg-light-navy border-r border-lightest-navy/20 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold font-mono text-green">Admin Panel</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(baseLinkClass, isActive ? activeLinkClass : inactiveLinkClass)}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-lightest-navy/20 space-y-2">
        <NavLink
          to="/"
          className={cn(baseLinkClass, inactiveLinkClass)}
        >
          <Home className="mr-3 h-5 w-5" />
          <span>Back to Site</span>
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate hover:bg-light-navy hover:text-lightest-slate"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}