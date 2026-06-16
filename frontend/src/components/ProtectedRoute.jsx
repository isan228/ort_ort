import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser } from '../api/client.js';

export default function ProtectedRoute() {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
