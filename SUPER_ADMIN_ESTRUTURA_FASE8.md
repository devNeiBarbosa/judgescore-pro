# Exploração da área Super Admin (base v1.6-phase7-approved)

## Contexto
- Projeto: `stagecore_work`
- Objetivo: mapear a implementação atual de Super Admin para início do PATCH FINAL.

## 1) Página `app/super-admin/page.tsx`
- **Arquivo encontrado**: `app/super-admin/page.tsx`.
- **Tipo de componente**: **Client Component** (`'use client'` no topo).
- **Arquitetura**:
  - Usa `useSession` + `useRouter` para proteção/redirect no client.
  - Carrega dados via `fetch('/api/super-admin/organizations')`.
  - Atualiza organização via `PATCH /api/super-admin/organizations`.
  - Inicia impersonação via `POST /api/super-admin/impersonation`.
  - Encerra impersonação via `DELETE /api/super-admin/impersonation`.
  - Renderiza layout com `MainLayout` + `Container` e tabela em `styled-components`.

## 2) O que já existe no painel
Existe um painel operacional completo de organizações com:
- Listagem tabular de organizações.
- Campos exibidos por organização:
  - `name`, `slug`
  - `planType`, `subscriptionStatus`
  - `billingPlanType`, `billingStatus`, `billingExpiresAt`
  - `championshipsUsedInCycle`, `isActive`, `createdAt`
  - contadores (`users`, `championships`)
- Ações por linha:
  - alterar `planType`
  - alterar `subscriptionStatus`
  - ativar/desativar organização (`isActive`)
  - iniciar impersonação
- Ações globais:
  - `Encerrar Impersonação`
  - `Atualizar`

## 3) Componentes em `app/super-admin/` e `app/_components/super-admin/`
- Não há pasta/componentes dedicados em `app/_components/super-admin/`.
- Em `app/super-admin/`, há apenas `page.tsx` (UI monolítica da página).
- Ou seja: hoje o Super Admin está concentrado em um único arquivo de página, sem extração de subcomponentes específicos.

## 4) Endpoint de criação de organização (SUPER_ADMIN)
**Arquivo**: `app/api/super-admin/organizations/route.ts`

### Métodos implementados
- `GET`: lista organizações com `_count`.
- `POST`: cria organização (escopo SUPER_ADMIN).
- `PATCH`: atualiza organização (escopo SUPER_ADMIN).

### Criação (`POST`) — comportamento atual
- Exige role `SUPER_ADMIN` (`requireRole`).
- Entrada:
  - `name` obrigatório (mín. 2 chars)
  - `slug` opcional
- Sanitização: `sanitizeInput`.
- Geração de slug:
  - usa `slugify`
  - garante unicidade com sufixo incremental (`-2`, `-3`, ...).
- Persiste em `Organization` com dados mínimos (`name`, `slug`).
- Retorna `201` com organização criada.
- Auditoria: `SUPER_ADMIN_ORGANIZATION_CREATED`.

### Observação importante
- A UI atual (`app/super-admin/page.tsx`) **não chama o POST** de criação.
- Então backend de criação existe, mas não há formulário/botão de criação implementado na página atual.

## 5) Como impersonação funciona hoje

### Cookie de impersonação
- Nome: `stagecore_impersonation_org`.
- Definido em:
  - `lib/tenant.ts` (constante exportada)
  - usado por API de impersonação, auth e middleware.

### Set/clear do cookie
- `POST /api/super-admin/impersonation`:
  - valida `organizationId`
  - valida organização existente e ativa
  - seta cookie `httpOnly`, `sameSite=lax`, `path=/`, `maxAge=8h`
  - gera auditoria `SUPER_ADMIN_IMPERSONATION_STARTED`
- `DELETE /api/super-admin/impersonation`:
  - limpa cookie (`maxAge: 0`)
  - gera auditoria `SUPER_ADMIN_IMPERSONATION_STOPPED` quando havia org ativa

### Como `actingOrganizationId` é resolvido
- Em `auth-options.ts` (callback de `session`):
  - se role é `SUPER_ADMIN`, lê cookie de impersonação
  - `session.user.actingOrganizationId = impersonatedOrganizationId`
  - `session.user.isImpersonating = Boolean(cookie)`
  - sem impersonação, `actingOrganizationId` fica `null` para SUPER_ADMIN
- Em `lib/api-guard.ts` (`requireRole`):
  - para SUPER_ADMIN: `actingOrganizationId = cookie || null`
  - para não-super-admin: `actingOrganizationId = organizationId`

### Propagação para escopo multi-tenant
- `middleware.ts`:
  - se SUPER_ADMIN, `x-tenant-id` recebe org do cookie
  - se usuário normal, `x-tenant-id` recebe `token.organizationId`
- `lib/tenant.ts` / `lib/organization-scope.ts`:
  - usam `actingOrganizationId` para montar filtros tenant-aware
  - SUPER_ADMIN sem impersonação pode operar sem binding em alguns fluxos (bypass explícito)

## 6) Conclusão objetiva para próximos passos
1. Existe página Super Admin funcional, mas concentrada em um único `page.tsx` client-side.
2. Listagem e gestão de status/plano já estão prontas.
3. Backend de criação de organização (`POST`) já existe e está auditado.
4. Falta UI explícita para criação de organização na página atual.
5. Impersonação já está implementada de ponta a ponta via cookie `stagecore_impersonation_org`, refletida em sessão, middleware e guards.
6. Próximo patch pode focar em:
   - adicionar UX de criação de organização na página,
   - extrair subcomponentes para melhorar manutenção,
   - opcionalmente exibir estado visual de impersonação ativa.
