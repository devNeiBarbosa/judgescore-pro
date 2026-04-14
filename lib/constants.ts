/**
 * Centralized business constants.
 * SINGLE SOURCE OF TRUTH for all magic numbers and configuration.
 */

// ============================================================
// Authentication & Security
// ============================================================

export const AUTH = {
  SESSION_MAX_AGE: 24 * 60 * 60, // 24 hours in seconds
  BCRYPT_ROUNDS: 12,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  SIGNUP_MAX_ATTEMPTS: 5,
  SIGNUP_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 120,
} as const;

// ============================================================
// Business Rules
// ============================================================

export const BUSINESS = {
  /** Minimum age for athlete registration */
  MIN_AGE: 10,
  /** Maximum age for athlete registration */
  MAX_AGE: 100,
  /** Phone digits (BR): 10 (landline) or 11 (mobile) */
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 11,
  /** CPF length (digits only) */
  CPF_LENGTH: 11,
  /** Category name min length */
  CATEGORY_NAME_MIN: 2,
  /** Championship name min length */
  CHAMPIONSHIP_NAME_MIN: 3,
} as const;

// ============================================================
// Plan Types (for Phase 3 — modeling only)
// ============================================================

export const PLAN_TYPES = {
  EVENTO: 'EVENTO',
  SAAS: 'SAAS',
  LICENCA: 'LICENCA',
} as const;

export const PLAN_PRICES = {
  EVENTO: 6500_00,   // R$ 6.500 in centavos
  SAAS: 5000_00,     // R$ 5.000/mês in centavos
  LICENCA: 49700_00, // R$ 49.700 in centavos
} as const;

export const PLAN_LABELS: Record<string, string> = {
  EVENTO: 'Evento Único',
  SAAS: 'SaaS Mensal',
  LICENCA: 'Licença Vitalícia',
};

// ============================================================
// Subscription Status (for Phase 3)
// ============================================================

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

// ============================================================
// Audit Actions Registry
// ============================================================

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_RATE_LIMITED: 'LOGIN_RATE_LIMITED',
  USER_SIGNUP: 'USER_SIGNUP',
  // Admin
  ADMIN_CREATE_USER: 'ADMIN_CREATE_USER',
  // Championship
  CHAMPIONSHIP_CREATED: 'CHAMPIONSHIP_CREATED',
  CHAMPIONSHIP_UPDATED: 'CHAMPIONSHIP_UPDATED',
  // Category
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  // Referee
  REFEREE_ASSIGNED: 'REFEREE_ASSIGNED',
  REFEREE_REMOVED: 'REFEREE_REMOVED',
  // Judgment
  JUDGMENT_SUBMITTED: 'JUDGMENT_SUBMITTED',
  JUDGMENT_FINALIZED: 'JUDGMENT_FINALIZED',
  // Result
  RESULT_CALCULATED: 'RESULT_CALCULATED',
  RESULT_TIE_BROKEN: 'RESULT_TIE_BROKEN',
  // Order
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_PAID: 'ORDER_PAID',
  ORDER_REFUNDED: 'ORDER_REFUNDED',
  // Organization (Phase 2)
  ORG_CREATED: 'ORG_CREATED',
  ORG_UPDATED: 'ORG_UPDATED',
  PLAN_ASSIGNED: 'PLAN_ASSIGNED',
  PLAN_CHANGED: 'PLAN_CHANGED',
} as const;
