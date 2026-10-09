# Relatório — MVP Pratuca (outubro de 2026)

## O que funciona

| Área | Situação |
| --- | --- |
| Site institucional (`/`, `/precos`, `/ajuda`, `/termos`, `/privacidade`) | Pronto, responsivo, SEO básico e Open Graph. Demonstrações marcadas como "Exemplo ilustrativo"; sem depoimentos ou números inventados |
| Cadastro, login, recuperação de senha | Pronto (Supabase Auth), erros em pt-BR |
| Onboarding (negócio → atendimento → produto → publicar) | Pronto, progresso salvo em `stores.onboarding_step` |
| Painel: início | Pedidos do dia, aguardando, vendido no dia, produção, últimos pedidos, checklist, abrir/fechar loja, link |
| Pedidos | Filtros por data/status, cards no celular e tabela no desktop, detalhes, transições validadas no banco, histórico, cancelamento com confirmação |
| Resumo de produção | Por produto e variação; cancelados excluídos; "a produzir" × "produzidos" |
| Cardápio | Produtos com foto, descrição, preço, categoria, disponível/desativado, ordem, grupos de opções/adicionais |
| Cardápio do dia | Seleção de produtos por data, preço do dia, copiar do último, publicar/rascunho |
| Categorias, clientes, configurações | Prontos (inclui horários, formas de pagamento, slug com confirmação, logo, anonimização de cliente) |
| Cardápio público | Carrinho persistente, opções obrigatórias/opcionais, entrega/retirada, troco, validação, confirmação |
| WhatsApp | Link `wa.me` com mensagem codificada, aberto só após o registro do pedido; sem afirmar entrega ou leitura |
| Assinatura | Estados, carência, bloqueio só de novos pedidos, página de plano; gateway pendente (sem simulação) |
| Segurança | RLS, grants mínimos, funções confiáveis, preço recalculado no servidor, idempotência, anti-spam, storage restrito |

## O que foi testado

- **Banco (38 testes, PostgreSQL 16 + shim do Supabase)**: isolamento entre lojas em todas as tabelas, inserção/alteração/movimentação cruzada bloqueadas, chaves compostas, anon sem acesso a tabelas, colunas protegidas, cálculo de totais e taxa, preços enviados pelo navegador ignorados, `PRICE_CHANGED`, idempotência (inclusive concorrente), numeração sequencial concorrente, loja fechada/não publicada/inexistente, produto indisponível/inativo/de outra loja, quantidades, cliente, endereço, modalidade, pagamento, pedido mínimo, adicionais (preço e mínimo/máximo), cardápio do dia, rate limit, cliente único por telefone, cardápio público sem dados privados, prévia só para membros, transições de status, teste vencido, carência, evento de cobrança idempotente e restrito a service_role, anonimização e storage por pasta.
- **Unitários e componentes (61 testes)**: carrinho e totais, reconciliação com o cardápio, seleção de opções, resumo de produção, transições, WhatsApp, moeda, telefone, slug, fuso, estado da assinatura, mensagens de erro, schemas, redirecionamento seguro, login, cadastro, onboarding, fluxo completo do cardápio público (envio sem preços, idempotência na nova tentativa, preço alterado, loja fechada, esgotado, loja inexistente) e diálogo de pedidos.
- **Qualidade**: `npm run lint`, `npm run typecheck` e `npm run build` sem erros nem avisos.
- **Revisão visual**: telas principais capturadas com Playwright em 390 px e 1280 px, com API do Supabase simulada; sem erros de console. Ajustes feitos: ações do diálogo de pedido, plural, foco inicial.

## Limitações e o que falta

- **Não foi testado contra um projeto Supabase real** (não havia projeto nem credenciais; Docker indisponível no ambiente). Auth, Storage e PostgREST reais precisam de um teste de fumaça após aplicar as migrações. Ver `docs/PENDING.md`.
- Os tipos em `src/types/database.ts` foram escritos à mão; regenere com a CLI após o primeiro deploy.
- Gateway de pagamento, SMTP próprio, CAPTCHA/rate limit por IP e revisão jurídica estão pendentes.
- Evoluções previstas: convites de equipe (`store_members`), limites de produção e horário de encerramento no cardápio do dia, fechamento automático por horário, Realtime para pedidos e API oficial do WhatsApp.
