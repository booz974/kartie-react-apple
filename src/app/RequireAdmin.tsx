import { Navigate, Outlet } from 'react-router';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';

export default function RequireAdmin() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  if (!ready) {
    // Attente courte : la session se résout presque toujours en quelques
    // dizaines de millisecondes, mais on dit quand même ce que l'on fait.
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <div className="k-card flex flex-col items-center gap-3 p-8 text-center" role="status">
          <span className="text-4xl leading-none" aria-hidden="true">
            🔐
          </span>
          <Spinner size={24} className="text-accent-ink" />
          <p className="k-subhead k-ink-secondary">Vérification de vos droits…</p>
        </div>
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
