import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/queries/queryClient';
import ErrorBoundary from '@/app/ErrorBoundary';
import { ConfirmProvider } from '@/components/ui/Confirm';
import { ToastProvider } from '@/components/ui/Toast';

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Les retours d'interface enveloppent l'application entière : n'importe
            quelle vue peut confirmer une action ou signaler une erreur sans
            sortir du produit. */}
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
