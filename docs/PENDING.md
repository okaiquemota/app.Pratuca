# Integrações pendentes de credenciais ou decisão

| Item | Situação | O que falta |
| --- | --- | --- |
| Projeto Supabase de produção | Não criado | Criar o projeto, aplicar as migrações e preencher `.env.local` / variáveis da Vercel |
| Supabase Auth (e-mails, URLs) | Código pronto | Configurar Site URL, Redirect URLs e templates de e-mail em pt-BR |
| SMTP próprio para e-mails de Auth | Não configurado | O SMTP padrão do Supabase tem limites baixos; configurar SMTP próprio antes do lançamento |
| Gateway de pagamentos | Arquitetura pronta, sem adaptador | Escolher o gateway, implementar o adaptador, configurar segredos e webhook (`docs/BILLING.md`) |
| API oficial do WhatsApp | Não implementada (fora do escopo v1) | Fluxo atual usa `wa.me`; a abstração em `src/features/whatsapp/notifier.ts` aceita uma implementação futura no servidor |
| Canais de suporte | Variáveis opcionais | Definir `VITE_SUPPORT_EMAIL` e `VITE_SUPPORT_WHATSAPP` |
| Domínio e deploy | `vercel.json` pronto | Conectar o repositório à Vercel e configurar o domínio |
| CAPTCHA / rate limit por IP | Não implementado | Recomendado antes de escalar (`docs/SECURITY.md`) |
| Revisão jurídica | Rascunhos publicados e sinalizados | Revisar termos e política de privacidade |
