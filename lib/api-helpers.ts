/**
 * Centralized API response helpers + audit logging.
 * ALL API routes MUST use these helpers for consistency.
 *
 * Usage:
 *   return apiSuccess({ user }, 201);
 *   return apiError('Dados inválidos', 400);
 *   return apiError('Não autorizado', 401);
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================
// Standard API Response Format
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

/**
 * Returns a standardized success response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Returns a standardized error response.
 */
export function apiError(
  message: string,
  status = 400,
  code?: string
): NextResponse {
  const body: ApiErrorResponse = { success: false, error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

// Common error shortcuts
export const API_ERRORS = {
  UNAUTHORIZED: () => apiError('Não autenticado', 401, 'UNAUTHORIZED'),
  FORBIDDEN: () => apiError('Acesso negado', 403, 'FORBIDDEN'),
  NOT_FOUND: (entity = 'Recurso') => apiError(`${entity} não encontrado`, 404, 'NOT_FOUND'),
  CONFLICT: (msg: string) => apiError(msg, 409, 'CONFLICT'),
  RATE_LIMITED: () => apiError('Muitas requisições. Aguarde.', 429, 'RATE_LIMITED'),
  INTERNAL: () => apiError('Erro interno do servidor', 500, 'INTERNAL_ERROR'),
  VALIDATION: (msg: string) => apiError(msg, 400, 'VALIDATION_ERROR'),
} as const;

// ============================================================
// Safe error logger (never exposes stack to client)
// ============================================================

export function logApiError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[API:${context}]`, msg);
}

// ============================================================
// Audit Log Helper
// ============================================================

interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId?: string;
  details?: string;
  ipAddress?: string;
}

/**
 * Records an audit log entry. Non-blocking — never throws.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch {
    // Audit failure must NEVER block the main operation
  }
}

// ============================================================
// Request IP extractor
// ============================================================

export function getRequestIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
}
