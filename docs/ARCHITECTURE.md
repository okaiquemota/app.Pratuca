# Arquitetura e decisões

## Visão geral

SPA em React servida estaticamente + Supabase. Não há servidor Node próprio: a lógica confiável vive em **funções SQL `SECURITY DEFINER`** e **RLS** no Postgres, e (para cobrança) em **Edge Functions**. O frontend só espelha regras para melhorar a experiência; o banco é a fonte da verdade.

```
src/
  app/            roteador, providers, página de erro
  components/     ui/ (kit acessível), layout/ (site, painel, auth), brand/
  features/
    auth/         serviços, schemas, provider de sessão, guardas, páginas
    onboarding/   assistente em 4 etapas
    stores/       loja: serviços, hooks, schemas, configurações
    catalog/      categorias, produtos, adicionais, cardápio do dia
    orders/       pedidos, status, resumo de produção
    customers/    clientes e anonimização
    public-menu/  cardápio público, carrinho, checkout
    whatsapp/     link wa.me, mensagem, abstração de notificação
    billing/      plano, estado da assinatura, gateway (pendente)
    marketing/    landing, preços, ajuda, termos, privacidade
  lib/            env, cliente Supabase, formatação pt-BR, telefone, fuso, erros, imagens
  types/          tipos do banco
supabase/
  migrations/     SQL versionado
  functions/      Edge Functions de cobrança
  tests/          testes de integração do banco + shim local
```

## Decisões

| Decisão | Motivo |
| --- | --- |
| Valores em **centavos inteiros** | Evita erros de ponto flutuante; checagens no banco (`total = subtotal + taxa`). |
| **anon sem acesso a tabelas** | O cardápio público vem de `get_public_menu(slug)`, que retorna só campos públicos. Pedidos só por `create_public_order`. |
| Grants explícitos + revogação de defaults | Supabase está tornando a exposição opt-in; projetos antigos concedem tudo por padrão. As migrações funcionam nos dois cenários (testado). |
| **Chaves estrangeiras compostas `(id, store_id)`** | Uma loja não consegue referenciar categoria/produto/pedido de outra, mesmo com bug de RLS. |
| Criação da loja via RPC `create_store` | Cria loja, vínculo de proprietário e assinatura de teste atomicamente. |
| Uma loja por proprietário (MVP) | Índice único em `stores.owner_id`; reduz abuso de testes. Remover o índice libera várias lojas. |
| `store_members` com papéis `owner`/`staff` | Prepara usuários adicionais. Staff opera catálogo/pedidos; configurações e anonimização são do owner. Convites ainda não implementados. |
| Tabela `plans` | Prepara planos futuros; v1 só tem `essencial`. |
| TanStack Query | Cache, estados de carregamento/erro e atualização periódica de pedidos sem reimplementar. |
| Componentes próprios sobre `<dialog>` nativo | Foco preso, Esc e fundo inerte nativos, sem dependência extra. |
| Pedidos atualizam por polling (20 s) | Simples e robusto. Realtime do Supabase é evolução natural (RLS já compatível). |
| React Router 7 (não 8) | API estável e conhecida; migração para 8 é simples quando necessário. |
| TypeScript 6.0 | typescript-eslint ainda não suporta TS 7. |

## Modelo de dados

`profiles`, `stores`, `store_members`, `plans`, `subscriptions`, `billing_events`, `categories`, `products`, `product_option_groups`, `product_options`, `daily_menus`, `daily_menu_items`, `customers`, `orders`, `order_items`, `order_status_history`.

- UUID em todos os IDs; `timestamptz` em todas as datas.
- `order_items` guarda **snapshots** (nome, preço unitário, opções, total da linha): alterar ou excluir produtos não muda pedidos antigos.
- `orders.number` é sequencial por loja (`#0001`), atribuído com bloqueio da linha da loja.

## Regras de negócio

### Criação de pedido (`create_public_order`)
1. Loja vem do **slug** (o navegador não envia `store_id`). Precisa estar publicada, aberta e com assinatura válida.
2. **Idempotência** por `(store_id, idempotency_key)`: reenvio devolve o mesmo pedido (`duplicate: true`). O frontend mantém a mesma chave enquanto carrinho e dados não mudam.
3. Produtos e opções precisam pertencer à loja, estar ativos e disponíveis; regras de mínimo/máximo por grupo são verificadas.
4. **Preços, adicionais, taxa e total são recalculados no servidor.** Se `expected_total_cents` (o que o cliente viu) divergir, o pedido é recusado com `PRICE_CHANGED` e o cardápio é recarregado.
5. Taxa de entrega só em `delivery`; pedido mínimo considera o subtotal (sem taxa).
6. Anti-abuso: até 5 pedidos por telefone e 120 por loja a cada 10 minutos.
7. Cliente é registrado/atualizado por `(loja, telefone)` com apenas nome e telefone.

### Cardápio do dia
Seleção de produtos existentes para uma data (fuso da loja), com preço opcional sobrescrito e disponibilidade. Se existir cardápio do dia **publicado** para hoje, o cliente vê **apenas** esses itens; senão, vê todos os produtos ativos. Evoluções previstas: `max_quantity` em `daily_menu_items` (limite de produção) e horário de encerramento em `daily_menus`, ambos verificáveis em `create_public_order`.

### Status
`new → confirmed → preparing → ready → out_for_delivery → completed`, com cancelamento a partir de qualquer status não final.
- Só avança (pode pular etapas); nunca volta.
- `out_for_delivery` só para entregas.
- `completed` e `canceled` são finais.
- Validado em `private.can_transition` + `update_order_status`; cada mudança grava `order_status_history`.

### Resumo de produção
Soma quantidades por produto (e por combinação de opções) dos pedidos do dia:
- **Cancelado:** não entra.
- **Novo, confirmado, em preparo:** "a produzir".
- **Pronto, saiu para entrega, concluído:** "já produzido".
O total do produto soma as duas parcelas. Implementado em `src/features/orders/production.ts` (testado).

### Total vendido
Soma de `total_cents` dos pedidos **não cancelados** do dia (inclui taxas de entrega).

### Horários
Exibidos ao cliente. A abertura para pedidos é controlada pelo botão "Loja aberta" (manual). Fechamento automático por horário é uma evolução (a coluna `opening_hours` já está validada no banco).

### Assinatura e acesso
`private.store_has_access`:
- **trialing:** até `trial_ends_at`.
- **active / past_due:** até `current_period_end` + 3 dias de carência.
- **canceled:** até o fim do período pago.
- **pending:** bloqueado.

Bloqueio = apenas **novos pedidos públicos**. Painel e dados continuam acessíveis; nada é apagado por inadimplência.
