import { Navigate, Outlet } from 'react-router';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';

export default function RequireAdmin() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  if (!ready) {
    // Attente courte et silencieuse : la session se résout presque toujours en
    // quelques dizaines de millisecondes.
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size={24} className="k-ink-tertiary" label="Vérification de vos droits" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
