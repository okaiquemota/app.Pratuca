# Segurança e privacidade

## Controles implementados

- **RLS em todas as tabelas**, com acesso limitado às lojas do usuário (`private.my_store_ids()`).
- **Menor privilégio**: privilégios padrão revogados; grants por tabela e por coluna (ex.: `owner_id` e `last_order_number` não são atualizáveis pelo cliente; pedidos não têm `INSERT/UPDATE/DELETE` diretos).
- **anon** não lê nenhuma tabela, exceto `plans`. O cardápio público expõe só campos públicos (sem `owner_id`, `store_id`, clientes ou pedidos) — testado.
- **Funções `SECURITY DEFINER`** com `search_path = ''`, validação de entrada e mensagens-código estáveis.
- **Preços nunca vêm do navegador**; divergência gera `PRICE_CHANGED`.
- **Idempotência** de pedidos e de eventos de cobrança.
- **Uploads**: bucket com limite de 2 MB e tipos JPG/PNG/WebP; escrita só na pasta `<store_id>/` do próprio membro; o cliente redimensiona imagens antes do envio.
- **Sem dados de cartão** em nenhum lugar.
- **Segredos**: só a chave pública vai ao frontend. `service_role` é usada apenas em Edge Functions.
- **Logs**: Edge Functions registram apenas tipo de evento/código de erro, nunca payloads, tokens ou dados pessoais.
- **Redirecionamento seguro** após login (`safeNext` só aceita caminhos internos).
- **Headers** (Vercel): CSP restrita, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## Limitações conhecidas (exigem infraestrutura adicional)

- O rate limit de pedidos é por telefone e por loja, dentro do banco. **Limite por IP e CAPTCHA** (ex.: Cloudflare Turnstile + Edge Function) são recomendados antes de escalar.
- O limite por loja (120 pedidos/10 min) protege o banco, mas um atacante poderia usá-lo para atrapalhar uma loja: monitore e combine com rate limit por IP.
- Rate limit de Auth: configure em Auth → Rate Limits no painel do Supabase.
- `is_slug_available` permite descobrir slugs existentes (são públicos de qualquer forma).

## Backup e recuperação

- Planos pagos do Supabase fazem backups diários; o **Point-in-Time Recovery** é um add-on recomendado para produção.
- Exporte periodicamente com `supabase db dump` (schema e dados) para um armazenamento externo cifrado.
- Teste restauração em um projeto separado ao menos uma vez por trimestre.
- Imagens do Storage não entram no dump do banco: faça cópia do bucket `store-media` separadamente.

## Exclusão de dados

- **Cliente final**: a loja usa "Remover dados" em Clientes (`anonymize_customer`), que apaga nome, telefone, endereço e observações dos pedidos e remove o registro do cliente, preservando valores para a contabilidade da loja.
- **Lojista**: solicitação ao suporte. Procedimento administrativo (service_role/SQL Editor):
  1. Confirmar identidade pelo e-mail cadastrado.
  2. `delete from public.stores where owner_id = '<user_id>';` (cascata remove catálogo, pedidos, clientes e assinatura).
  3. Remover a pasta `<store_id>/` do bucket `store-media`.
  4. Excluir o usuário em Auth → Users.
  5. Registrar a data da exclusão.

  `stores.owner_id` usa `ON DELETE RESTRICT` justamente para que excluir um usuário não apague uma loja por acidente.

## LGPD

Termos e política de privacidade são **rascunhos para revisão jurídica**. Não há declaração de conformidade automática.
