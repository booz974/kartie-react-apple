import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export default function RequireAdmin() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
