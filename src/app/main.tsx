import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppProviders from '@/app/providers';
import { router } from '@/app/router';
import { waitForAuthReady } from '@/stores/authStore';
import '@/styles/tailwind.css';
import '@/styles/global.css';

function Bootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void waitForAuthReady().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
