import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredUser } from '../api/client.js';

export default function ProtectedRoute() {
  const user = getStoredUser();
  const location = useLocation();

  if (!user) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
