export const ROLES = {
  USER: 'user',
  MANAGER: 'manager',
  TUTOR: 'tutor',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
};

export const USER_PHASE = {
  BEFORE_RESULTS: 'before_results',
  AFTER_RESULTS: 'after_results',
  ARCHIVED: 'archived',
};

export const PUBLIC_DISPLAY_MODE = {
  NICKNAME: 'nickname',
  CERTIFICATE_NUMBER: 'certificate_number',
};

export const AUTH_LOGIN_MODE = {
  PHONE: 'phone',
  EMAIL: 'email',
  PHONE_OR_EMAIL: 'phone_or_email',
};

export const CERTIFICATE_STATUS = {
  NOT_UPLOADED: 'not_uploaded',
  UPLOADED: 'uploaded',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const SCORE_MODE = {
  DRAFT: 'draft',
  FINAL: 'final',
};

export const CORRECTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export const PENDING_REGISTRATION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const DEVICE_TYPE = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
};

export const TRUST_LEVEL = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const CATALOG_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

export const LEGAL_DOCUMENT_TYPE = {
  PRIVACY: 'privacy',
  OFFER: 'offer',
  TERMS: 'terms',
};

export const WALLET_TX_TYPE = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export const BALANCE_TYPE = {
  BONUS: 'bonus',
  COIN: 'coin',
};

export const ALLOWED_CERT_MIME = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

export const MAX_CERT_SIZE_BYTES = 10 * 1024 * 1024;

/** Основной балл ОРТ: минимум для поступления и максимум по шкале */
export const ORT_MAIN_SCORE_MIN = 100;
export const ORT_MAIN_SCORE_MAX = 250;

/** Минимальный балл по предметным тестам ОРТ */
export const ORT_SUBJECT_SCORE_MIN = 60;
export const ORT_SUBJECT_SCORE_MAX = 300;

export const PROMO_DISCOUNT_TYPE = {
  PERCENT: 'percent',
  FIXED: 'fixed',
};

export const TOUR_STATUS = {
  UPCOMING: 'upcoming',
  OPEN: 'open',
  CLOSED: 'closed',
};

export const TOUR_SLOT_TYPE = {
  BUDGET: 'budget',
  CONTRACT: 'contract',
};

export const PARTICIPATION_STATUS = {
  JOINED: 'joined',
  WITHDRAWN: 'withdrawn',
};

export const TIMER_MODE = {
  GLOBAL: 'global',
  UNIVERSITY: 'university',
  FACULTY: 'faculty',
  SPECIALTY: 'specialty',
};

export const FAVORITE_ENTITY_TYPE = {
  UNIVERSITY: 'university',
  FACULTY: 'faculty',
  SPECIALTY: 'specialty',
  ANALYSIS: 'analysis',
};

export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
};

export const NEWS_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

export const NOTIFICATION_TYPE = {
  SYSTEM: 'system',
  PAYMENT: 'payment',
  CERTIFICATE: 'certificate',
  TOUR: 'tour',
  ANALYSIS: 'analysis',
  SECURITY: 'security',
  SUPPORT: 'support',
  BONUS: 'bonus',
};

export const REFERRAL_REWARD_STATUS = {
  PENDING: 'pending',
  AWARDED: 'awarded',
  REJECTED: 'rejected',
  FRAUD: 'fraud',
};

export const REDEMPTION_FEATURE = {
  SUBSCRIPTION_DISCOUNT: 'subscription_discount',
  EXTRA_ANALYSIS: 'extra_analysis',
  COMPARE_UNLOCK: 'compare_unlock',
  TOUR_UNLOCK: 'tour_unlock',
};

export const TUTOR_LINK_PLATFORM = {
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
  OTHER: 'other',
};

export const TUTOR_LINK_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

