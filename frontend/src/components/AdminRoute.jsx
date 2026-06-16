import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { api, getStoredUser, isStaffRole } from '../api/client.js';

export default function AdminRoute() {
  const stored = getStoredUser();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (!stored) {
      setAllowed(false);
      return;
    }

    if (isStaffRole(stored.role?.code)) {
      setAllowed(true);
      return;
    }

    api
      .me()
      .then((data) => setAllowed(isStaffRole(data.role)))
      .catch(() => setAllowed(false));
  }, [stored]);

  if (allowed === null) return <p>Загрузка...</p>;
  if (!stored) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/account" replace />;

  return <Outlet />;
}
