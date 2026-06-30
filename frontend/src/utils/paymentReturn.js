/**
 * Finik appends ?paymentId=...&status=succeeded to RedirectUrl.
 * If RedirectUrl already contains ?, the browser gets a broken query like:
 *   ?payment=return?paymentId=uuid&status=succeeded
 */
export function parsePaymentReturnParams(searchParams, pathname = '') {
  let paymentId =
    searchParams.get('paymentId') ||
    searchParams.get('payment_id') ||
    searchParams.get('PaymentId');

  const status = (searchParams.get('status') || searchParams.get('Status') || '').toLowerCase();
  const paymentParam = searchParams.get('payment') || '';

  if (!paymentId) {
    const embedded =
      paymentParam.match(/paymentId=([0-9a-f-]{36})/i)?.[1] ||
      paymentParam.match(/payment_id=([0-9a-f-]{36})/i)?.[1];
    if (embedded) paymentId = embedded;
  }

  if (!paymentId && typeof window !== 'undefined') {
    const href = window.location.href;
    const match = href.match(/paymentId=([0-9a-f-]{36})/i) || href.match(/payment_id=([0-9a-f-]{36})/i);
    if (match) paymentId = match[1];
  }

  const pathReturn = pathname.includes('payment-return');
  const isReturn =
    pathReturn ||
    paymentParam === 'return' ||
    paymentParam.startsWith('return') ||
    Boolean(paymentId && (status === 'succeeded' || status === 'failed' || status === ''));

  return { isReturn, paymentId, status };
}

export function clearPaymentReturnParams(searchParams) {
  const next = new URLSearchParams(searchParams);
  next.delete('payment');
  next.delete('paymentId');
  next.delete('payment_id');
  next.delete('PaymentId');
  next.delete('status');
  next.delete('Status');
  return next;
}

export function extractPaymentIdFromUrl(url = '') {
  const match = String(url).match(/paymentId=([0-9a-f-]{36})/i) || String(url).match(/payment_id=([0-9a-f-]{36})/i);
  return match?.[1] || null;
}
