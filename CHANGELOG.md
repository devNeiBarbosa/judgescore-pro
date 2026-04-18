# CHANGELOG

## Tarefas 1-4 (SUPER_ADMIN)

### 1) Visão global (SUPER_ADMIN)
- `GET /api/super-admin/organizations`: listagem global de organizações (sem filtro tenant).
- `GET /api/admin/championships`: SUPER_ADMIN sem impersonação ativa recebe escopo global.
- `GET /api/admin/users`: SUPER_ADMIN sem impersonação ativa recebe escopo global.

### 2) Bypass de billing para SUPER_ADMIN
- `POST /api/admin/championships`: SUPER_ADMIN pode criar campeonato mesmo com billing inativo.
- `DELETE /api/admin/championships/[id]`: SUPER_ADMIN pode excluir campeonato mesmo com billing inativo.
- ADMIN comum permanece sujeito às validações de billing.

### 3) Dashboard Admin
- Card **"Painel Super Admin"** exibido somente quando `session.user.role === 'SUPER_ADMIN'`.

### 4) Delete global
- `DELETE /api/admin/users/[id]`: delete global de usuário protegido por `requireRole(..., ['SUPER_ADMIN'])`.
- `DELETE /api/super-admin/organizations/[id]`: delete global de organização protegido por `requireRole(..., ['SUPER_ADMIN'])`.

## Tarefa 5 (validação final)
- Dependências instaladas (`npm install --legacy-peer-deps`).
- Build de produção executado com sucesso (`npm run build`).
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).

## Fase 2 - Tarefas 1-2 (concluídas) + validação final

### Contexto concluído
- Inspeção completa dos fluxos de árbitros e contexto de tenant.
- Endpoints de árbitros corrigidos em `app/api/admin/championships/[id]/referees/route.ts`.
- Validação de contexto implementada: `SUPER_ADMIN` precisa de impersonação ativa para atribuição/remoção de árbitros.
- Proteção multi-tenant preservada com validação explícita de contexto ativo e pertencimento do campeonato.

### Ajustes técnicos aplicados
- Atribuição de árbitro (`POST`) usa `organizationId` exclusivamente do contexto autenticado (`actingOrganizationId`) e valida se o campeonato pertence à organização ativa.
- Remoção de árbitro (`DELETE`) usa o mesmo controle de escopo e impede remoção quando já existem julgamentos.
- O endpoint não depende de `organizationId` no payload para operação sensível de vínculo de árbitro.

### Validação final da fase
- Build de produção executado com sucesso (`npm run build`).
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).

## Fase 2 - Tarefa 3 (CRUD de categorias: edição e exclusão)

### Ajustes técnicos aplicados
- Novo endpoint criado em `app/api/admin/championships/[id]/categories/[categoryId]/route.ts` com suporte a `PATCH`, `PUT` e `DELETE`.
- Edição de categoria (`PATCH/PUT`) com validação de RBAC (`ADMIN`/`SUPER_ADMIN`), exigência de impersonação ativa para `SUPER_ADMIN`, validação de escopo por `tenantWhere`, sanitização de `name`/`description` e prevenção de nome duplicado no mesmo campeonato.
- Exclusão de categoria (`DELETE`) com validação de RBAC e escopo (`organizationId` derivado do contexto/campeonato, nunca do payload).
- Regra conservadora de integridade aplicada: bloqueio de exclusão com `409 Conflict` quando existir qualquer vínculo em `Judgment` e/ou `CategoryResult`.
- Não há deleção em cascata manual de julgamentos/resultados; a API exige remoção prévia dos vínculos.

### Frontend
- Fluxo atual não possui ações de editar/excluir categoria na tela de detalhes do campeonato; nenhuma alteração de frontend foi necessária para este patch mínimo.

### Validação
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).

## Fase 2 - Tarefa 4 (CRUD de usuários operacionais)

### Ajustes técnicos aplicados
- Novo endpoint criado em `app/api/admin/athletes/route.ts` com `POST` para criação manual de atleta.
- RBAC aplicado (`ADMIN` e `SUPER_ADMIN`), com exigência de impersonação ativa para `SUPER_ADMIN` em operações de escrita.
- `organizationId` sempre resolvido pelo contexto autenticado (`actingOrganizationId`), nunca pelo payload.
- Criação de atleta com campos mínimos (`name`, `email`), `role` fixo como `ATLETA`, geração de senha temporária aleatória e hash com `bcrypt` no padrão atual.
- Novo endpoint criado em `app/api/admin/athletes/[id]/route.ts` com `DELETE` para exclusão de atleta no escopo da organização ativa.
- Exclusão de atleta com bloqueio de self-delete e limpeza transacional conservadora dos vínculos operacionais (participações, resultados, julgamentos por participação, inscrições, pedidos e logs do usuário) antes de remover o usuário.
- Novo endpoint criado em `app/api/admin/referees/[id]/route.ts` com `DELETE` para exclusão de árbitro no escopo da organização ativa.
- Exclusão de árbitro restrita aos papéis `ARBITRO_CENTRAL` e `ARBITRO_AUXILIAR`, com bloqueio de self-delete.
- Regra conservadora para árbitro: bloqueio com `409 Conflict` quando houver vínculos em atribuições (`ChampionshipReferee`) e/ou julgamentos (`Judgment`), sem limpeza automática/manual dos vínculos.

### Validação
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).

## Fase 3 - Tarefa 5 (validação final e preparação de entrega)

### Contexto da Fase 3 (Tarefas 3-4 concluídas)
- CRUD de categorias: edição + exclusão implementadas ✅
- CRUD de atletas: criação manual + exclusão implementadas ✅
- CRUD de árbitros: exclusão com proteção implementada ✅

### Validação técnica executada
- Build de produção executado com sucesso (`npm run build`).
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).
- Validação feita por análise de código + rotas (sem execução E2E/UI em runtime), conforme diretriz desta tarefa.

### Checklist de pronto (análise estática)
1. ADMIN consegue editar categoria: **YES**
2. ADMIN consegue excluir categoria: **YES**
3. ADMIN consegue julgar categoria: **YES** *(assumido por consistência lógica; fluxo de julgamento pré-existente não foi alterado nesta fase)*
4. SUPER_ADMIN em impersonação consegue editar/excluir/julgar categoria: **YES** *(editar/excluir validados por rota; julgamento assumido por consistência lógica)*
5. ADMIN consegue criar atleta manualmente: **YES**
6. ADMIN consegue excluir atleta: **YES**
7. ADMIN consegue excluir árbitro central e auxiliar: **YES** *(com bloqueio 409 quando existem vínculos operacionais)*
8. SUPER_ADMIN em impersonação consegue fazer as mesmas ações: **YES**
9. multi-tenant permanece protegido: **YES**
10. build/typescript ok: **YES**

### Arquivos da Fase 3 (escopo consolidado das Tarefas 3-4 + validação da Tarefa 5)
- `app/api/admin/championships/[id]/categories/[categoryId]/route.ts`
- `app/api/admin/athletes/route.ts`
- `app/api/admin/athletes/[id]/route.ts`
- `app/api/admin/referees/[id]/route.ts`
- `CHANGELOG.md`

## Fase 4 - Tarefa 7 (validação final e preparação de entrega)

### Contexto recebido
- Tarefas 1-6 consideradas concluídas previamente (planos, logos, footer e favicon).
- Commits de referência informados: `73c757b`, `ad161f9`, `feaab40`, `49b746b`, `1e891e1`.

### Validação técnica executada
- Build de produção executado com sucesso (`npm run build`).
- Checagem TypeScript executada com sucesso (`npx tsc --noEmit`).
- Não foram encontrados erros de compilação/tipagem nesta validação.

### Checklist de pronto (8 critérios)
1. Planos com ícones elegantes (sem bolinhas): **YES**
2. Descrições mais profissionais: **YES**
3. Plano Premium destacado: **YES**
4. Botão "Suporte" no Business discreto: **YES**
5. Logo maior (header, login, cadastro, footer): **YES**
6. Favicon visível e correto: **YES**
7. Footer mais profissional com espaço para CNPJ: **YES**
8. Layout geral preservado: **YES** *(validação por build + análise estática de código)*

### Arquivos verificados no escopo da tarefa
- `src/components/PricingPlans.tsx`
- `src/components/layout/header.tsx`
- `app/login/_components/login-page.tsx`
- `app/registro/_components/register-page.tsx`
- `src/components/layout/footer.tsx`
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon.svg`
- `CHANGELOG.md`

## Fase 5 - Tarefa 4 (validação final e preparação de entrega)

### Contexto recebido
- Tarefas 1-3 concluídas previamente:
  - Navbar expandida com novos links ✅
  - Visibilidade por role implementada ✅
  - Sidebar mobile ajustada com ícones e touch-friendly ✅
- Commits de referência: `5f7c36b`, `a0cdfe8`.

### Escopo de validação (patch mínimo)
- Validação feita **apenas por inspeção de código** em `src/components/layout/header.tsx`.
- Por solicitação explícita desta tarefa: **não** executar build, **não** rodar aplicação e **não** realizar testes manuais.

### Checklist de pronto (inspeção estática)
1. Navbar com novos links funcionando: **YES**
2. Visibilidade correta por role: **YES**
3. SUPER_ADMIN vê "Organizações": **YES**
4. ADMIN não vê "Organizações": **YES**
5. Sidebar mobile com mesmos links: **YES**
6. Layout intacto: **YES**
7. Navegação funcional: **NO** *(o botão "Perfil" está com `handleNav('#')`, sem rota real)*

### Arquivo alterado/verificado
- `src/components/layout/header.tsx` (verificação)
- `CHANGELOG.md` (registro desta validação)