const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('access_token');
}

function setSession(data) {
  const accessToken = data.access_token || data.accessToken;
  const refreshToken = data.refresh_token || data.refreshToken;
  const user = data.user;

  if (accessToken) localStorage.setItem('access_token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

export function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export const STAFF_ROLES = ['manager', 'admin', 'superadmin'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function getUserRole() {
  return getStoredUser()?.role?.code || null;
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

let refreshPromise = null;

async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Refresh token отсутствует');
    }

    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Не удалось обновить сессию');
    }

    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request(path, options = {}, retried = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const canRetry =
      !retried &&
      response.status === 401 &&
      getRefreshToken() &&
      !path.startsWith('/api/v1/auth/login') &&
      !path.startsWith('/api/v1/auth/register') &&
      !path.startsWith('/api/v1/auth/refresh');

    if (canRetry) {
      try {
        await refreshSession();
        return request(path, options, true);
      } catch {
        clearSession();
      }
    }

    const message = data?.error?.message || 'Ошибка запроса';
    const error = new Error(message);
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

export const api = {
  health: () => request('/api/health'),

  // Auth API-001..004
  getAuthConfig: () => request('/api/v1/auth/config'),
  register: async (body) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || 'Ошибка запроса';
      const error = new Error(message);
      error.code = data?.error?.code;
      throw error;
    }
    return data;
  },
  login: async (body) => {
    const data = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) });
    setSession(data);
    return data;
  },
  forgotPassword: (identifier) =>
    request('/api/v1/auth/password/forgot', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (body) =>
    request('/api/v1/auth/password/reset', { method: 'POST', body: JSON.stringify(body) }),
  refreshSession,
  logout: async () => {
    try {
      await request('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // session may already be invalid
    }
    clearSession();
  },

  // Account API-005..012
  me: () => request('/api/v1/account/me'),
  updateProfile: (body) =>
    request('/api/v1/account/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  getSessions: () => request('/api/v1/account/sessions'),
  revokeSession: (id) => request(`/api/v1/account/sessions/${id}`, { method: 'DELETE' }),
  getScores: () => request('/api/v1/account/scores'),
  saveDraftScores: (body) =>
    request('/api/v1/account/scores/draft', { method: 'PUT', body: JSON.stringify(body) }),
  finalizeScores: (body) =>
    request('/api/v1/account/scores/final', { method: 'PUT', body: JSON.stringify(body) }),
  uploadCertificate: async (file) => {
    const formData = new FormData();
    formData.append('certificate', file);
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/v1/account/certificate`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'Ошибка загрузки');
    return data;
  },
  createCorrectionRequest: (message) =>
    request('/api/v1/account/scores/correction-request', {
      method: 'POST',
      body: JSON.stringify({ reason: message }),
    }),

  // Analysis API-013..014
  getAnalysisContext: () => request('/api/v1/analysis/context'),
  runAnalysis: (body) => request('/api/v1/analysis', { method: 'POST', body: JSON.stringify(body) }),
  getAnalysisHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/analysis/history${q ? `?${q}` : ''}`);
  },
  getAnalysis: (id) => request(`/api/v1/analysis/${id}`),

  // Catalog API-017..018
  getUniversities: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/catalog/universities${q ? `?${q}` : ''}`);
  },
  getUniversity: (slug) => request(`/api/v1/catalog/universities/${slug}`),
  getProgram: (slug) => request(`/api/v1/catalog/program/${slug}`),
  listPrograms: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/catalog/programs${q ? `?${q}` : ''}`);
  },

  // Tours API-019..022
  getTours: () => request('/api/v1/tours'),
  getTour: (id) => request(`/api/v1/tours/${id}`),
  joinTour: (id, slotType) =>
    request(`/api/v1/tours/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ slot_type: slotType }),
    }),
  withdrawTour: (id) => request(`/api/v1/tours/${id}/withdraw`, { method: 'POST' }),

  // Rankings API-023
  getRanking: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/rankings/kyrgyzstan${q ? `?${q}` : ''}`);
  },

  // Monetization API-024..028
  getPlans: () => request('/api/v1/subscription/plans'),
  getSubscription: () => request('/api/v1/subscription'),
  createPayment: (planId, applyBalance = false, promoCode = null) =>
    request('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        apply_balance: applyBalance,
        promo_code: promoCode || undefined,
      }),
    }),
  previewPromoCode: (planId, promoCode) =>
    request('/api/v1/promo/preview', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, promo_code: promoCode }),
    }),
  confirmPayment: (paymentId) =>
    request(`/api/v1/payments/${paymentId}/confirm`, { method: 'POST' }),
  getWallet: () => request('/api/v1/wallet'),
  getReferral: () => request('/api/v1/referral'),
  getRedemptionRules: () => request('/api/v1/wallet/redemption-rules'),
  redeemBonus: (feature) =>
    request('/api/v1/wallet/redeem', { method: 'POST', body: JSON.stringify({ feature }) }),
  getTutorLinks: () => request('/api/v1/tutors/links'),

  // Content API-029..030
  getNews: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/news${q ? `?${q}` : ''}`);
  },
  getNewsArticle: (slug) => request(`/api/v1/news/${slug}`),

  // Notifications API-031..032
  getNotifications: () => request('/api/v1/notifications'),
  markNotificationRead: (id) =>
    request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),

  // Admin
  adminPendingCertificates: () => request('/api/v1/admin/certificates/pending'),
  adminVerifyCertificate: (id) =>
    request(`/api/v1/admin/certificates/${id}/verify`, { method: 'POST' }),
  adminRejectCertificate: (id, rejection_reason) =>
    request(`/api/v1/admin/certificates/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    }),
  adminPendingCorrections: () => request('/api/v1/admin/corrections/pending'),
  adminApproveCorrection: (id, body) =>
    request(`/api/v1/admin/corrections/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  adminRejectCorrection: (id, admin_comment) =>
    request(`/api/v1/admin/corrections/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ admin_comment }),
    }),
  adminPublishResults: (published) =>
    request('/api/v1/admin/settings/ort-results-published', {
      method: 'POST',
      body: JSON.stringify({ published }),
    }),
  adminSupportTickets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/support/tickets${q ? `?${q}` : ''}`);
  },
  adminGetCatalog: () => request('/api/v1/admin/catalog'),
  adminCreateUniversity: (body) =>
    request('/api/v1/admin/catalog/universities', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateUniversity: (id, body) =>
    request(`/api/v1/admin/catalog/universities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateFaculty: (body) =>
    request('/api/v1/admin/catalog/faculties', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateFaculty: (id, body) =>
    request(`/api/v1/admin/catalog/faculties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateSpecialty: (body) =>
    request('/api/v1/admin/catalog/specialties', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateSpecialty: (id, body) =>
    request(`/api/v1/admin/catalog/specialties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreateProgramRule: (body) =>
    request('/api/v1/admin/catalog/program-rules', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateProgramRule: (id, body) =>
    request(`/api/v1/admin/catalog/program-rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCreatePassingScore: (body) =>
    request('/api/v1/admin/catalog/passing-scores', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdatePassingScore: (id, body) =>
    request(`/api/v1/admin/catalog/passing-scores/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminGetTours: () => request('/api/v1/admin/tours'),
  adminCreateTour: (body) =>
    request('/api/v1/admin/tours', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateTour: (id, body) =>
    request(`/api/v1/admin/tours/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminGetNews: () => request('/api/v1/admin/news'),
  adminCreateNews: (body) =>
    request('/api/v1/admin/news', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateNews: (id, body) =>
    request(`/api/v1/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminGetUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/users${q ? `?${q}` : ''}`);
  },
  adminUpdateUser: (id, body) =>
    request(`/api/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminGetRoles: () => request('/api/v1/admin/roles'),
  adminGetLegal: () => request('/api/v1/admin/legal'),
  adminUpdateLegal: (type, locale, body) =>
    request(`/api/v1/admin/legal/${type}/${locale}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminGetFaq: () => request('/api/v1/admin/faq'),
  adminCreateFaq: (body) =>
    request('/api/v1/admin/faq', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateFaq: (id, body) =>
    request(`/api/v1/admin/faq/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteFaq: (id) => request(`/api/v1/admin/faq/${id}`, { method: 'DELETE' }),
  adminGetPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/v1/admin/payments${q ? `?${q}` : ''}`);
  },
  adminConfirmPayment: (id) =>
    request(`/api/v1/admin/payments/${id}/confirm`, { method: 'POST' }),
  adminCancelPayment: (id, reason) =>
    request(`/api/v1/admin/payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  adminFailPayment: (id, reason) =>
    request(`/api/v1/admin/payments/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  adminGetPromoCodes: () => request('/api/v1/admin/promo-codes'),
  adminCreatePromoCode: (body) =>
    request('/api/v1/admin/promo-codes', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdatePromoCode: (id, body) =>
    request(`/api/v1/admin/promo-codes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getLegalDocument: (type, locale = 'ru') =>
    request(`/api/v1/legal/${type}?locale=${locale}`),

  getFaq: (locale = 'ru') => request(`/api/v1/faq?locale=${locale}`),

  // Support API-033..035
  getSupportTickets: () => request('/api/v1/support/tickets'),
  getSupportTicket: (id) => request(`/api/v1/support/tickets/${id}`),
  createSupportTicket: (body) =>
    request('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify(body) }),
  replySupportTicket: (id, message) =>
    request(`/api/v1/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Collections API-015..016
  addFavorite: (body) => request('/api/v1/favorites', { method: 'POST', body: JSON.stringify(body) }),
  getFavorites: () => request('/api/v1/favorites'),
  removeFavorite: (id) => request(`/api/v1/favorites/${id}`, { method: 'DELETE' }),
  createComparison: (body) =>
    request('/api/v1/comparisons', { method: 'POST', body: JSON.stringify(body) }),
  getComparisons: () => request('/api/v1/comparisons'),
};
