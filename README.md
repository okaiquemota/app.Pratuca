# Pratuca

**Seu delivery, sem bagunça.** — SaaS de cardápio digital e organização de pedidos para marmitarias e pequenos negócios de alimentação. Uma solução MovCode.

- Cardápio público com link próprio (`/loja/<slug>`), carrinho, adicionais e pedido sem cadastro.
- Pedido registrado no banco **antes** de abrir o WhatsApp (`https://wa.me/`), com idempotência.
- Painel do empreendedor: pedidos por status, resumo de produção, cardápio e cardápio do dia, clientes, configurações e assinatura.
- Plano único de R$ 39,90/mês, 7 dias de teste, sem comissão. Cobrança real **pendente de gateway** (veja `docs/BILLING.md`).

## Stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · React Router 7 · TanStack Query · React Hook Form + Zod · Lucide · Supabase (Auth, Postgres, Storage, Edge Functions) · Vitest + Testing Library.

## Requisitos

- Node.js 22+
- Um projeto Supabase (para rodar o app de verdade)
- PostgreSQL 15+ local (apenas para `npm run test:db`; não precisa de credenciais)

## Instalação e desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:5173
```

Sem as variáveis do Supabase, o site institucional funciona e as áreas que dependem de banco mostram um aviso de configuração pendente.

## Configuração do Supabase

1. Crie um projeto em https://supabase.com (região `sa-east-1` recomendada).
2. **Auth → Providers → Email**: mantenha e-mail/senha ativo. Recomenda-se ativar "Confirm email".
3. **Auth → URL Configuration**:
   - Site URL: a URL pública do app (ex.: `https://app.pratuca.com.br`).
   - Redirect URLs: `<site>/app/comecar` e `<site>/redefinir-senha` (e `http://localhost:5173/**` em desenvolvimento).
4. Aplique as migrações (abaixo). Elas criam tabelas, RLS, funções e o bucket `store-media`.
5. Copie a URL do projeto e a **publishable key** (ou anon key legada) para `.env.local`. **Nunca** use a service_role no frontend.
6. Opcional: personalize os e-mails de Auth em pt-BR (Auth → Email Templates).

### Migrações

Os arquivos versionados ficam em `supabase/migrations/`:

| Arquivo | Conteúdo |
| --- | --- |
| `20261009120000_initial_schema.sql` | Tipos, tabelas, índices, chaves compostas, gatilhos |
| `20261009120100_security_rls.sql` | Revogação de privilégios padrão, grants mínimos, RLS |
| `20261009120200_business_functions.sql` | Cardápio público, criação de pedido, status, assinatura, anonimização |
| `20261009120300_storage.sql` | Bucket `store-media` (2 MB, JPG/PNG/WebP) e políticas |

Com a Supabase CLI:

```bash
npx supabase login
npx supabase init            # se ainda não houver supabase/config.toml (mantém a pasta migrations)
npx supabase link --project-ref <ref>
npx supabase db push
```

Sem CLI: execute os quatro arquivos, em ordem, no SQL Editor do painel.

Depois de mudar o schema, regenere os tipos:

```bash
npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
```

> Os tipos atuais foram escritos à mão no mesmo formato do gerador; revise o diff ao regenerar.

### Edge Functions (cobrança)

`supabase/functions/billing-checkout` e `billing-webhook` estão prontas para receber um adaptador de gateway, mas respondem `501 billing_not_configured` até a integração (veja `docs/BILLING.md`).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run lint` | ESLint (incluindo regras do React Compiler) |
| `npm run typecheck` | TypeScript strict |
| `npm test` | Testes unitários e de componentes (jsdom) |
| `npm run test:db` | Sobe um PostgreSQL temporário, aplica shim do Supabase + migrações e roda os testes de banco |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm run check` | lint + typecheck + test + build |

### Testes de banco

`npm run test:db` usa os binários do PostgreSQL (`initdb`, `pg_ctl`) encontrados em `/usr/lib/postgresql/*/bin` ou em `PG_BIN`. O arquivo `supabase/tests/sql/supabase_shim.sql` emula roles (`anon`, `authenticated`, `service_role`), `auth.uid()` e `storage` — **somente para teste local**. Eles cobrem isolamento entre lojas (RLS), manipulação de preços, idempotência, concorrência, regras de status, assinatura, storage e anonimização.

Para rodar contra um banco existente (ex.: `supabase start` com Docker), defina `TEST_DATABASE_URL` e execute `npx vitest run --project db` — **nunca** contra produção.

## Deploy

O frontend é estático (SPA). `vercel.json` já inclui rewrites para o React Router, cache imutável de assets e headers de segurança (CSP, `X-Frame-Options`, etc.).

1. Importe o repositório na Vercel (framework Vite; build `npm run build`; saída `dist`).
2. Configure as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` (e opcionais de suporte).
3. Atualize Site URL / Redirect URLs no Supabase Auth com o domínio final.
4. Se usar outro host, configure fallback de rotas para `index.html` e replique os headers.

A CSP permite conexões apenas com `*.supabase.co`. Se usar domínio customizado do Supabase, ajuste `vercel.json`.

## Documentação

- `docs/ARCHITECTURE.md` — decisões, modelo de dados, regras de negócio
- `docs/SECURITY.md` — segurança, privacidade, backup e exclusão de dados
- `docs/BILLING.md` — como integrar o gateway de pagamentos
- `docs/PENDING.md` — integrações pendentes de credenciais
- `docs/REPORT.md` — relatório do que funciona, do que foi testado e do que falta
