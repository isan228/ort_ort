import { Navigate, useSearchParams } from 'react-router-dom';

/** Старые Finik URL → личный кабинет / регистрация с сохранением query. */
export default function PaymentReturnRedirect({ to }) {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={qs ? `${to}?${qs}` : to} replace />;
}
