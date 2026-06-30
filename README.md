# ORT.KG — API Reference (v1)

Базовый URL: `http://localhost:3001/api/v1`

**Деплой на сервер:** см. [DEPLOY.md](./DEPLOY.md)

## Auth

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-001 | POST | `/auth/register` | Public |
| API-002 | POST | `/auth/login` | Public |
| API-003 | POST | `/auth/password/forgot` | Public |
| API-004 | POST | `/auth/password/reset` | Public |
| — | POST | `/auth/refresh` | Public (refresh_token) |
| — | POST | `/auth/logout` | Auth |

## Account

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-005 | GET | `/account/me` | Auth |
| API-006 | PATCH | `/account/profile` | Auth |
| API-007 | GET | `/account/sessions` | Auth |
| API-008 | DELETE | `/account/sessions/:id` | Auth |
| API-009 | PUT | `/account/scores/draft` | Auth |
| API-010 | PUT | `/account/scores/final` | Auth |
| API-011 | POST | `/account/certificate` | Auth (multipart) |
| API-012 | POST | `/account/scores/correction-request` | Auth |

## Analysis & Catalog

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-013 | POST | `/analysis` | Auth |
| API-014 | GET | `/analysis/history` | Auth |
| API-015 | POST | `/favorites` | Auth |
| API-016 | POST | `/comparisons` | Auth/Premium |
| API-017 | GET | `/catalog/universities` | Public/Premium |
| API-018 | GET | `/catalog/program/:slug` | Public/Premium |

## Tours & Rankings

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-019 | GET | `/tours` | Public |
| API-020 | GET | `/tours/:id` | Public/Auth |
| API-021 | POST | `/tours/:id/join` | Auth/Premium |
| API-022 | POST | `/tours/:id/withdraw` | Auth/Premium |
| API-023 | GET | `/rankings/kyrgyzstan` | Auth/Premium |

## Monetization

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-024 | GET | `/subscription/plans` | Auth |
| API-025 | POST | `/payments` | Auth |
| API-026 | POST | `/payments/callback` | Provider |
| API-027 | GET | `/wallet` | Auth |
| API-028 | GET | `/referral` | Auth |

## Content & Support

| ID | Method | Route | Доступ |
|----|--------|-------|--------|
| API-029 | GET | `/news` | Public |
| API-030 | GET | `/news/:slug` | Public |
| API-031 | GET | `/notifications` | Auth |
| API-032 | PATCH | `/notifications/:id/read` | Auth |
| API-033 | GET | `/support/tickets` | Auth |
| API-034 | POST | `/support/tickets` | Auth |
| API-035 | POST | `/support/tickets/:id/messages` | Auth/Manager |

## Admin

| Route | Доступ |
|-------|--------|
| `/admin/certificates/pending` | Manager+ |
| `/admin/certificates/:id/verify` | Manager+ |
| `/admin/certificates/:id/reject` | Manager+ |
| `/admin/catalog` | Manager+ (read), Admin+ (write) |
| `/admin/catalog/universities` | Admin+ |
| `/admin/catalog/faculties` | Admin+ |
| `/admin/catalog/specialties` | Admin+ |
| `/admin/catalog/program-rules` | Admin+ |
| `/admin/catalog/passing-scores` | Admin+ |
| `/admin/tours` | Manager+ (read), Admin+ (write) |
| `/admin/news` | Manager+ (read), Admin+ (write) |
| `/admin/users` | Manager+ (read), Admin+ (write) |
| `/admin/roles` | Manager+ |
| `/admin/legal` | Manager+ (read), Admin+ (write) |
| `/admin/faq` | Manager+ (read), Admin+ (write) |
| `/admin/payments` | Admin+ (reconcile stub) |

## Legal (public)

| Route | Доступ |
|-------|--------|
| `GET /legal/:type?locale=ru\|ky` | Public (privacy, terms, offer) |
| `GET /faq?locale=ru\|ky` | Public |

## Health

`GET /api/health` — вне v1 prefix

## Статус реализации

- **Готово:** API-001..012, 013..035, admin (certs, corrections, support, catalog, tours, news, users, legal, faq, payments), auth refresh/logout + forgot/reset UI, FAQ page, i18n RU/KY, legal pages, audit, notifications
- **Stub:** API-026 callback (stub provider), API-003/004 (dev_token без email/SMS)
- **Далее:** email/SMS провайдер, i18n на оставшихся страницах, AV scan uploads
