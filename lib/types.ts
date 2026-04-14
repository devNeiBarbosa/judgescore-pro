// Domain types for Championship Management System
// SINGLE SOURCE OF TRUTH for all TypeScript interfaces

import type { UserRole, ChampionshipStatus, ParticipationStatus, CategoryRegistrationStatus, ProductType, PaymentStatus, InscriptionStatus } from '@prisma/client';

export type { UserRole, ChampionshipStatus, ParticipationStatus, CategoryRegistrationStatus, ProductType, PaymentStatus, InscriptionStatus };

// ============================================================
// Auth & Session
// ============================================================

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  actingOrganizationId: string | null;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
}

// ============================================================
// Organization (Phase 2 — Multi-Tenant)
// ============================================================

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  planType: string;
  subscriptionStatus: string;
  isActive: boolean;
}

// ============================================================
// Plan & Subscription (Phase 3 — Modeling)
// ============================================================

export type PlanType = 'EVENTO' | 'SAAS' | 'LICENCA';
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
export type LicenseType = 'PER_EVENT' | 'MONTHLY' | 'LIFETIME';

export interface PlanDefinition {
  type: PlanType;
  name: string;
  price: number;          // in centavos
  description: string;
  licenseType: LicenseType;
  isBrandingAllowed: boolean;
  maintenanceRequired: boolean;
  features: string[];
}

export interface ChampionshipSummary {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: ChampionshipStatus;
  venue?: string;
  city?: string;
  state?: string;
  bannerUrl?: string;
  logoUrl?: string;
}

export interface ParticipationSummary {
  id: string;
  athleteNumber: string | null;
  weight: string | null;   // Decimal from Prisma serialized as string
  height: string | null;   // Decimal from Prisma serialized as string
  status: ParticipationStatus;
  athleteName: string;
  athleteEmail: string;
}

export interface CategoryWithRegistrations {
  id: string;
  name: string;
  description?: string;
  registrationCount: number;
}

export interface JudgmentEntry {
  participationId: string;
  position: number | null;
}

export interface ResultEntry {
  participationId: string;
  athleteName: string;
  athleteNumber: number;
  finalPosition: number;
  totalScore: number;
  tieBreaker: boolean;
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  ATLETA: 'Atleta',
  ARBITRO_AUXILIAR: 'Árbitro Auxiliar',
  ARBITRO_CENTRAL: 'Árbitro Central',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ONGOING: 'Em Andamento',
  FINISHED: 'Finalizado',
  PRE_REGISTERED: 'Pré-inscrito',
  WEIGHED: 'Pesado',
  CONFIRMED: 'Confirmado',
  DISQUALIFIED: 'Desclassificado',
  PENDING: 'Pendente',
  CANCELLED: 'Cancelado',
  PAID: 'Pago',
  FAILED: 'Falhou',
  REFUNDED: 'Reembolsado',
  REGISTERED: 'Registrado',
  CHECKIN_PENDING: 'Check-in Pendente',
  CHECKIN_DONE: 'Check-in Concluído',
  COMPLETED: 'Concluído',
};
