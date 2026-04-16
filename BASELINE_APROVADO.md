# BASELINE APROVADO — Fase 1

## Status
Baseline oficial aprovada para continuidade das próximas fases.

## Commit HEAD aprovado
Este commit (identificado permanentemente pela tag **v1.0-phase1-approved**).

> Para obter o hash exato: `git rev-parse v1.0-phase1-approved`

## Data da aprovação
2026-04-15 20:41:45 -03

## Referência do HEAD imediatamente anterior (antes da documentação de baseline)
- Commit: aaef4ab2f84bfc5a5c45e88fffd93e4732ee9bc0
- Mensagem: docs: consolida entrega final da Fase 1

## Arquivos que fazem parte desta baseline
A lista completa de arquivos versionados nesta baseline é:

```text
.abacus.donotdelete
.gitignore
.yarnrc.yml
BRANDING.md
FASE1_COMPLETO.md
PRODUCTION_AUDIT.md
PRODUCTION_AUDIT.pdf
STYLE_GUIDE.md
app/_components/landing-page.tsx
app/api/admin/championships/[id]/categories/[categoryId]/finalize/route.ts
app/api/admin/championships/[id]/categories/[categoryId]/reopen/route.ts
app/api/admin/championships/[id]/categories/[categoryId]/result-pdf/route.ts
app/api/admin/championships/[id]/categories/[categoryId]/results/route.ts
app/api/admin/championships/[id]/categories/route.ts
app/api/admin/championships/[id]/inscriptions/route.ts
app/api/admin/championships/[id]/inscriptions/search/route.ts
app/api/admin/championships/[id]/referees/route.ts
app/api/admin/championships/[id]/route.ts
app/api/admin/championships/route.ts
app/api/admin/inscriptions/[id]/checkin/route.ts
app/api/admin/inscriptions/[id]/edit/route.ts
app/api/admin/inscriptions/[id]/route.ts
app/api/admin/invitations/route.ts
app/api/admin/participations/route.ts
app/api/admin/stats/route.ts
app/api/admin/users/route.ts
app/api/athlete/championships/route.ts
app/api/athlete/inscriptions/[id]/receipt/route.ts
app/api/athlete/inscriptions/route.ts
app/api/auth/[...nextauth]/route.ts
app/api/auth/change-password/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
app/api/judge/championships/[championshipId]/categories/[categoryId]/finalize/route.ts
app/api/judge/championships/[championshipId]/categories/[categoryId]/participations/route.ts
app/api/judge/championships/[championshipId]/categories/route.ts
app/api/judge/championships/route.ts
app/api/judge/judgments/route.ts
app/api/signup/route.ts
app/api/super-admin/impersonation/route.ts
app/api/super-admin/organizations/route.ts
app/dashboard/_components/dashboard-page.tsx
app/dashboard/admin/campeonatos/[id]/checkin/page.tsx
app/dashboard/admin/campeonatos/[id]/page.tsx
app/dashboard/admin/campeonatos/page.tsx
app/dashboard/admin/championships/[id]/checkin/page.tsx
app/dashboard/admin/championships/[id]/page.tsx
app/dashboard/admin/convites/page.tsx
app/dashboard/admin/page.tsx
app/dashboard/admin/usuarios/page.tsx
app/dashboard/athlete/page.tsx
app/dashboard/judge/championships/[championshipId]/categories/[categoryId]/page.tsx
app/dashboard/judge/championships/[championshipId]/page.tsx
app/dashboard/judge/page.tsx
app/dashboard/page.tsx
app/first-access/page.tsx
app/globals.css
app/layout.tsx
app/login/_components/login-page.tsx
app/login/page.tsx
app/page.tsx
app/providers.tsx
app/registro/_components/register-page.tsx
app/registro/page.tsx
app/signup/page.tsx
app/super-admin/page.tsx
components.json
components/layouts/app-shell.tsx
components/layouts/auth-layout.tsx
components/layouts/container.tsx
components/layouts/page-header.tsx
components/layouts/section.tsx
components/theme-provider.tsx
components/theme-toggle.tsx
components/ui/accordion.tsx
components/ui/alert-dialog.tsx
components/ui/alert.tsx
components/ui/animate.tsx
components/ui/aspect-ratio.tsx
components/ui/avatar.tsx
components/ui/badge.tsx
components/ui/breadcrumb.tsx
components/ui/button.tsx
components/ui/calendar.tsx
components/ui/card.tsx
components/ui/carousel.tsx
components/ui/checkbox.tsx
components/ui/collapsible.tsx
components/ui/command.tsx
components/ui/context-menu.tsx
components/ui/date-range-picker.tsx
components/ui/dialog.tsx
components/ui/drawer.tsx
components/ui/dropdown-menu.tsx
components/ui/form.tsx
components/ui/hover-card.tsx
components/ui/input-otp.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/menubar.tsx
components/ui/navigation-menu.tsx
components/ui/pagination.tsx
components/ui/popover.tsx
components/ui/progress.tsx
components/ui/radio-group.tsx
components/ui/resizable.tsx
components/ui/scroll-area.tsx
components/ui/select.tsx
components/ui/separator.tsx
components/ui/sheet.tsx
components/ui/skeleton.tsx
components/ui/slider.tsx
components/ui/sonner.tsx
components/ui/switch.tsx
components/ui/table.tsx
components/ui/tabs.tsx
components/ui/task-card.tsx
components/ui/textarea.tsx
components/ui/toast.tsx
components/ui/toaster.tsx
components/ui/toggle-group.tsx
components/ui/toggle.tsx
components/ui/tooltip.tsx
components/ui/use-toast.ts
hooks/use-toast.ts
lib/api-guard.ts
lib/api-helpers.ts
lib/audit-log.ts
lib/auth-options.ts
lib/category-result-pdf.ts
lib/category-results.ts
lib/checkin.ts
lib/constants.ts
lib/db.ts
lib/email.ts
lib/global-styles.ts
lib/inscription-receipt.ts
lib/judging.ts
lib/organization-scope.ts
lib/prisma.ts
lib/styled-registry.tsx
lib/styled.d.ts
lib/tenant.ts
lib/theme.ts
lib/types.ts
lib/utils.ts
lib/validation.ts
middleware.ts
next-env.d.ts
next.config.js
package-lock.json
package.json
postcss.config.js
prisma/migrations/20260412190000_phase1_multi_tenant_super_admin/migration.sql
prisma/migrations/20260413100000_add_invitation_model_secure_signup/migration.sql
prisma/migrations/20260413123000_phase2_inscription_model/migration.sql
prisma/migrations/20260413160000_phase3_checkin_participation/migration.sql
prisma/migrations/20260414101000_phase4_judgment_position_system/migration.sql
prisma/migrations/20260414120000_phase5_category_result_official_pdf_reopen/migration.sql
prisma/migrations/20260414150000_hardening_auditlog_role_timestamp/migration.sql
prisma/migrations/20260414183000_force_password_change_super_admin/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
prisma/seed.ts
public/apple-touch-icon.png
public/assets/logo/README.md
public/assets/logo/icon-light.png
public/assets/logo/icon-main.png
public/assets/logo/icon-symbol.png
public/assets/logo/logo-primary-dark.png
public/assets/logo/logo-primary-light.jpg
public/assets/logo/logo-transparent-dark.png
public/assets/logo/logo-transparent-light.png
public/assets/logo/logo-vertical-dark.png
public/favicon-16x16.png
public/favicon-32x32.png
public/favicon.ico
public/favicon.svg
public/og-image.png
scripts/safe-seed.ts
scripts/seed.ts
src/components/layout/footer.tsx
src/components/layout/header.tsx
src/components/layout/main-layout.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/container.tsx
src/components/ui/input.tsx
src/components/ui/logo.tsx
src/hooks/use-auth.ts
src/services/api.ts
src/utils/format.ts
tailwind.config.ts
tsconfig.json
tsconfig.seed.json
tsconfig.tsbuildinfo
types/next-auth.d.ts
```

## Instrução para próximas fases
Todas as futuras mudanças devem considerar esta baseline como ponto oficial de partida.
Novas implementações devem ser feitas em commits/branches subsequentes, preservando a rastreabilidade pela tag **v1.0-phase1-approved**.
