import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/queries/queryClient';
import ErrorBoundary from '@/app/ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
