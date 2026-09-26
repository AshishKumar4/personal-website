import '@/lib/errorReporter';

const isMailSubdomain = window.location.hostname.startsWith('mail.');
const isMailRoute = window.location.pathname.startsWith('/mail');
const isApiRoute = window.location.pathname.startsWith('/api');

if (isMailSubdomain && !isMailRoute && !isApiRoute) {
  window.location.replace('/mail/inbox');
}
import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { RouteFallback } from '@/components/RouteFallback';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { loadHome } from '@/lib/site-data';

const path = window.location.pathname;
if (path === '/' || path === '/about' || path.startsWith('/blog')) {
  loadHome().catch(() => undefined);
}

function named<T extends Record<string, unknown>>(loader: () => Promise<T>, key: keyof T) {
  return lazy(() => loader().then(m => ({ default: m[key] as ComponentType })));
}

const BlogPage = named(() => import('@/pages/BlogPage'), 'BlogPage');
const BlogPostPage = named(() => import('@/pages/BlogPostPage'), 'BlogPostPage');
const AboutPage = named(() => import('@/pages/AboutPage'), 'AboutPage');
const LoginPage = named(() => import('@/pages/LoginPage'), 'LoginPage');
const AdminLayout = named(() => import('@/components/layout/AdminLayout'), 'AdminLayout');
const AdminPostsPage = named(() => import('@/pages/AdminPostsPage'), 'AdminPostsPage');
const AdminSettingsPage = named(() => import('@/pages/AdminSettingsPage'), 'AdminSettingsPage');
const AdminSecurityPage = named(() => import('@/pages/AdminSecurityPage'), 'AdminSecurityPage');
const AdminExperiencePage = named(() => import('@/pages/AdminExperiencePage'), 'AdminExperiencePage');
const AdminProjectsPage = named(() => import('@/pages/AdminProjectsPage'), 'AdminProjectsPage');
const AdminFilesPage = named(() => import('@/pages/AdminFilesPage'), 'AdminFilesPage');
const AdminDashboardPage = named(() => import('@/pages/AdminDashboardPage'), 'AdminDashboardPage');
const AdminPostEditorPage = named(() => import('@/pages/AdminPostEditorPage'), 'AdminPostEditorPage');
const AdminMessagesPage = named(() => import('@/pages/AdminMessagesPage'), 'AdminMessagesPage');
const MailLayout = named(() => import('@/components/mail/MailLayout'), 'MailLayout');
const MailInboxPage = named(() => import('@/pages/MailInboxPage'), 'MailInboxPage');
const MailThreadPage = named(() => import('@/pages/MailThreadPage'), 'MailThreadPage');
const MailComposePage = named(() => import('@/pages/MailComposePage'), 'MailComposePage');
const MailSettingsPage = named(() => import('@/pages/MailSettingsPage'), 'MailSettingsPage');

function page(element: JSX.Element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/about",
    element: page(<AboutPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/blog",
    element: page(<BlogPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/blog/:slug",
    element: page(<BlogPostPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin/login",
    element: page(<LoginPage />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin",
    element: page(<AdminLayout />),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: page(<AdminDashboardPage />) },
      { path: "posts", element: page(<AdminPostsPage />) },
      { path: "posts/new", element: page(<AdminPostEditorPage />) },
      { path: "posts/:slug/edit", element: page(<AdminPostEditorPage />) },
      { path: "experience", element: page(<AdminExperiencePage />) },
      { path: "projects", element: page(<AdminProjectsPage />) },
      { path: "messages", element: page(<AdminMessagesPage />) },
      { path: "files", element: page(<AdminFilesPage />) },
      { path: "settings", element: page(<AdminSettingsPage />) },
      { path: "security", element: page(<AdminSecurityPage />) },
    ]
  },
  {
    path: "/mail",
    element: page(<MailLayout />),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/mail/inbox" replace /> },
      { path: "compose", element: page(<MailComposePage />) },
      { path: "settings", element: <Navigate to="/mail/settings/addresses" replace /> },
      { path: "settings/:tab", element: page(<MailSettingsPage />) },
      { path: "feeds", element: <Navigate to="/mail/inbox" replace /> },
      {
        path: "feeds/:feedId",
        element: page(<MailInboxPage />),
        children: [
          { path: ":threadId", element: page(<MailThreadPage />) },
        ],
      },
      {
        path: ":label",
        element: page(<MailInboxPage />),
        children: [
          { path: ":threadId", element: page(<MailThreadPage />) },
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
