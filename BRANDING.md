# BRANDING — JUDGESCORE PRO

## 1) Estrutura oficial de assets

Local: `public/assets/logo/`

Arquivos oficiais:

- `icon-symbol.png`
- `icon-main.png`
- `icon-light.png`
- `logo-primary-dark.jpg`
- `logo-primary-light.jpg`
- `logo-transparent-dark.png`
- `logo-transparent-light.png`
- `logo-vertical-dark.jpg`

## 2) Regras de uso dos assets

- Fundo escuro:
  - Logo: `logo-primary-dark.jpg` (ou `logo-transparent-light.png` quando transparente)
  - Ícone: `icon-main.png`
- Fundo claro:
  - Logo: `logo-primary-light.jpg` (ou `logo-transparent-dark.png` quando transparente)
  - Ícone: `icon-light.png`
- Fallback global:
  - `icon-symbol.png`
- Login/splash/institucional:
  - `logo-vertical-dark.jpg`

## 3) Componente de logo

Arquivo: `src/components/ui/logo.tsx`

Props principais:

- `variant`: `'primary-dark' | 'primary-light' | 'transparent-dark' | 'transparent-light'`
- `height` (default `40`)
- `vertical` (usa versão vertical disponível)

Regras implementadas:

- Seleção por variante sem inversão CSS
- Proporção preservada com `width: auto`
- Fallback automático para `icon-symbol.png`

## 4) Aplicação no sistema

- Header (`src/components/layout/header.tsx`):
  - Fundo preto sólido `#000000`
  - `Logo variant="primary-dark" height={36}`
- Login (`app/login/_components/login-page.tsx`):
  - `Logo variant="primary-dark" vertical height={100}`
- Registro (`app/registro/_components/register-page.tsx`):
  - `Logo variant="primary-dark" vertical height={96}`
- Landing/Footer:
  - Versões transparentes adequadas para fundo escuro

## 5) Favicon e app icon

`app/layout.tsx` usa:

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`

Base: `public/assets/logo/icon-symbol.png`

## 6) PDFs

Arquivos:

- `lib/category-result-pdf.ts`
- `lib/inscription-receipt.ts`

Implementação:

- Header com `icon-symbol.png`
- Em fundo claro, usa `logo-transparent-dark.png`
- Fallback para `icon-symbol.png`

## 7) Cores oficiais

Aplicadas em `tailwind.config.ts` e `lib/theme.ts`:

- `primary: #D4AF37`
- `background: #000000`
- `text-primary: #FFFFFF`
- `text-secondary: #A0A0A0`

## 8) Tipografia

- Fonte: Inter (`next/font/google`)
- Fallback: `system-ui, sans-serif`
- Títulos: `700`
- Texto: `400`

## 9) Uso correto vs incorreto

Correto:

- Escolher asset conforme o fundo
- Manter proporção original
- Usar fallback `icon-symbol.png` quando necessário

Incorreto:

- Inverter cor de logo via CSS
- Distorcer largura/altura
- Aplicar sombra/efeitos artificiais no logo
- Usar logo clara em fundo claro (ou escura em fundo escuro)
