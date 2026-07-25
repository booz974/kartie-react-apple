import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button, { buttonClass } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur applicative:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        // Une panne n'est pas une impasse : on garde toujours deux issues, celle
        // qui retente sur place et celle qui ramène à un terrain connu.
        <main
          role="alert"
          className="flex min-h-dvh items-center justify-center px-5 py-16"
        >
          <div className="k-card flex max-w-md flex-col items-center p-8 text-center md:p-10">
            <span className="mb-5 text-6xl leading-none" aria-hidden="true">
              🛠️
            </span>
            <h1 className="k-title-1 text-balance">Une erreur est survenue</h1>
            <p className="k-callout k-ink-secondary mt-3">
              L&apos;affichage de cette page s&apos;est interrompu. Rien de ce que vous avez
              publié n&apos;est perdu.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => this.setState({ hasError: false })}
                leading={<Icon name="refresh" size={17} />}
              >
                Réessayer
              </Button>
              <a href="/" className={buttonClass({ variant: 'secondary' })}>
                <span aria-hidden="true">🏠</span>
                Retour à l&apos;accueil
              </a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
