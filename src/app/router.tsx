import { lazy } from 'react';
import { createBrowserRouter, ScrollRestoration } from 'react-router';
import AppShell from '@/app/AppShell';
import RequireAdmin from '@/app/RequireAdmin';

const HomeView = lazy(() => import('@/features/core/views/HomeView'));
const QuartiersView = lazy(() => import('@/features/core/views/QuartiersView'));
const QuartierView = lazy(() => import('@/features/territory/views/QuartierView'));
const QuartierFeedView = lazy(() => import('@/features/social/views/QuartierFeedView'));
const QuartierAssociationsView = lazy(
  () => import('@/features/associations/views/QuartierAssociationsView'),
);
const QuartierInfosView = lazy(() => import('@/features/territory/views/QuartierInfosView'));
const QuartierListView = lazy(() => import('@/features/territory/views/QuartierListView'));
const EventView = lazy(() => import('@/features/content/views/EventView'));
const AssociationView = lazy(() => import('@/features/associations/views/AssociationView'));
const AssociationDashboardView = lazy(
  () => import('@/features/associations/views/AssociationDashboardView'),
);
const AssociationEventView = lazy(
  () => import('@/features/associations/views/AssociationEventView'),
);
const PetitionView = lazy(() => import('@/features/democracy/views/PetitionView'));
const ConsultationView = lazy(() => import('@/features/democracy/views/ConsultationView'));
const CreateConsultationView = lazy(
  () => import('@/features/democracy/views/CreateConsultationView'),
);
const NewsView = lazy(() => import('@/features/content/views/NewsView'));
const ArticleView = lazy(() => import('@/features/content/views/ArticleView'));
const AdminView = lazy(() => import('@/features/admin/views/AdminView'));
const AdminAlaUneView = lazy(() => import('@/features/admin/views/AdminAlaUneView'));
const AdminSondagesView = lazy(() => import('@/features/admin/views/AdminSondagesView'));
const AdminRagView = lazy(() => import('@/features/admin/views/AdminRagView'));
const ChatView = lazy(() => import('@/features/social/views/ChatView'));
const NotFoundView = lazy(() => import('@/features/core/views/NotFoundView'));

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <AppShell />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomeView /> },
      { path: '/quartiers', element: <QuartiersView /> },
      { path: '/quartiers/:id', element: <QuartierView /> },
      { path: '/quartiers/:id/feed', element: <QuartierFeedView /> },
      { path: '/quartiers/:id/associations', element: <QuartierAssociationsView /> },
      { path: '/quartiers/:id/infos', element: <QuartierInfosView /> },
      { path: '/quartiers/:id/list', element: <QuartierListView /> },
      { path: '/events/:id', element: <EventView /> },
      { path: '/associations/:id', element: <AssociationView /> },
      { path: '/associations/:id/dashboard', element: <AssociationDashboardView /> },
      { path: '/associations/events/:id', element: <AssociationEventView /> },
      { path: '/petitions/:id', element: <PetitionView /> },
      { path: '/consultations/:id', element: <ConsultationView /> },
      { path: '/actualites/:id', element: <NewsView /> },
      { path: '/realisations/:id', element: <ArticleView /> },
      { path: '/chat', element: <ChatView /> },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin', element: <AdminView /> },
          { path: '/admin/alaune', element: <AdminAlaUneView /> },
          { path: '/admin/sondages', element: <AdminSondagesView /> },
          { path: '/admin/rag', element: <AdminRagView /> },
          { path: '/quartiers/:id/creer-sondage', element: <CreateConsultationView /> },
        ],
      },
      { path: '*', element: <NotFoundView /> },
    ],
  },
]);
