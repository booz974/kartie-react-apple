import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppProviders from '@/app/providers';
import { router } from '@/app/router';
import Spinner from '@/components/ui/Spinner';
import { waitForAuthReady } from '@/stores/authStore';
import '@/styles/tailwind.css';

function Bootstrap() {
  const [ready, setReady] = useState(false);
  // Un écran de démarrage qui apparaît puis disparaît aussitôt scintille. On ne
  // le montre qu'au-delà du seuil où l'attente devient perceptible.
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSpinner(true), 300);
    void waitForAuthReady().then(() => {
      window.clearTimeout(timer);
      setReady(true);
    });
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        {showSpinner ? (
          <Spinner size={26} className="k-ink-tertiary" label="Chargement de Kartie" />
        ) : null}
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
