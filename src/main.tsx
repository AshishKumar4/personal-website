import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { BlogPage } from '@/pages/BlogPage';
import { BlogPostPage } from '@/pages/BlogPostPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminPostsPage } from '@/pages/AdminPostsPage';
import { AdminSettingsPage } from '@/pages/AdminSettingsPage';
import { AdminSecurityPage } from '@/pages/AdminSecurityPage';
import { AdminExperiencePage } from '@/pages/AdminExperiencePage';
import { AdminProjectsPage } from '@/pages/AdminProjectsPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminPostEditorPage } from '@/pages/AdminPostEditorPage';
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/blog",
    element: <BlogPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/blog/:slug",
    element: <BlogPostPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "posts", element: <AdminPostsPage /> },
      { path: "posts/new", element: <AdminPostEditorPage /> },
      { path: "posts/:slug/edit", element: <AdminPostEditorPage /> },
      { path: "experience", element: <AdminExperiencePage /> },
      { path: "projects", element: <AdminProjectsPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "security", element: <AdminSecurityPage /> },
    ]
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)