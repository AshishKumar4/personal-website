import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();

const isMailSubdomain = window.location.hostname.startsWith('mail.');
const isMailRoute = window.location.pathname.startsWith('/mail');
const isApiRoute = window.location.pathname.startsWith('/api');

if (isMailSubdomain && !isMailRoute && !isApiRoute) {
  window.location.replace('/mail/inbox');
}
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
import { AdminFilesPage } from '@/pages/AdminFilesPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminPostEditorPage } from '@/pages/AdminPostEditorPage';
import { MailLayout } from '@/components/mail/MailLayout';
import { MailInboxPage } from '@/pages/MailInboxPage';
import { MailThreadPage } from '@/pages/MailThreadPage';
import { MailComposePage } from '@/pages/MailComposePage';
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
      { path: "files", element: <AdminFilesPage /> },
      { path: "settings", element: <AdminSettingsPage /> },
      { path: "security", element: <AdminSecurityPage /> },
    ]
  },
  {
    path: "/mail",
    element: <MailLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/mail/inbox" replace /> },
      { path: "compose", element: <MailComposePage /> },
      {
        path: ":label",
        element: <MailInboxPage />,
        children: [
          { path: ":threadId", element: <MailThreadPage /> },
        ],
      },
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