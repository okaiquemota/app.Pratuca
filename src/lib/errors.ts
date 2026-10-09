/**
 * Tradução dos códigos de erro do banco (raise exception 'CODIGO')
 * e de erros comuns do Supabase para mensagens em pt-BR.
 */
const businessMessages: Record<string, string> = {
  NOT_AUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
  STORE_NOT_FOUND: 'Não encontramos esta loja ou ela ainda não foi publicada.',
  STORE_UNAVAILABLE: 'Esta loja não está recebendo pedidos pela internet no momento.',
  STORE_CLOSED: 'A loja está fechada agora. Tente novamente no horário de funcionamento.',
  STORE_ALREADY_EXISTS: 'Sua conta já possui uma loja.',
  INVALID_STORE_NAME: 'Informe um nome entre 2 e 80 caracteres.',
  INVALID_SLUG: 'Endereço inválido. Use letras minúsculas, números e hífens (3 a 48 caracteres).',
  SLUG_TAKEN: 'Este endereço já está em uso. Escolha outro.',
  INVALID_REQUEST: 'Não foi possível processar o pedido. Atualize a página e tente novamente.',
  INVALID_CUSTOMER_NAME: 'Informe seu nome.',
  INVALID_CUSTOMER_PHONE: 'Informe um telefone válido com DDD.',
  RATE_LIMITED: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente novamente.',
  INVALID_FULFILLMENT: 'Escolha entre entrega ou retirada, conforme disponível na loja.',
  INVALID_ADDRESS: 'Preencha rua, número e bairro para a entrega.',
  INVALID_PAYMENT_METHOD: 'Escolha uma forma de pagamento aceita pela loja.',
  INVALID_CHANGE: 'O valor para troco precisa ser maior que o total do pedido.',
  EMPTY_ORDER: 'Seu carrinho está vazio.',
  TOO_MANY_ITEMS: 'O pedido tem itens demais. Divida em pedidos menores.',
  INVALID_QUANTITY: 'Quantidade inválida em um dos itens.',
  PRODUCT_UNAVAILABLE: 'Um dos produtos não está mais disponível. Revise seu carrinho.',
  OPTION_UNAVAILABLE: 'Uma das opções escolhidas não está mais disponível.',
  INVALID_OPTIONS: 'Revise as opções obrigatórias dos itens.',
  BELOW_MINIMUM_ORDER: 'O pedido não atingiu o valor mínimo da loja.',
  PRICE_CHANGED: 'Os preços do cardápio foram atualizados. Confira o novo total antes de enviar.',
  ORDER_NOT_FOUND: 'Pedido não encontrado.',
  INVALID_STATUS_TRANSITION: 'Essa mudança de status não é permitida.',
  CUSTOMER_NOT_FOUND: 'Cliente não encontrado.',
  SUPABASE_NOT_CONFIGURED: 'O sistema ainda não foi conectado ao banco de dados (variáveis do Supabase ausentes).',
}

const authMessages: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  [/user already registered|already been registered/i, 'Já existe uma conta com este e-mail.'],
  [/password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
  [/rate limit|too many requests/i, 'Muitas tentativas. Aguarde um pouco e tente novamente.'],
  [/invalid email|unable to validate email/i, 'E-mail inválido.'],
  [/new password should be different/i, 'A nova senha precisa ser diferente da atual.'],
  [/weak password|password is too weak|pwned/i, 'Senha fraca. Use uma combinação mais longa e difícil de adivinhar.'],
  [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
  [/jwt expired|refresh token/i, 'Sua sessão expirou. Entre novamente.'],
  [/duplicate key value.*slug/i, 'Este endereço já está em uso. Escolha outro.'],
  [/payload too large|exceeded the maximum allowed size/i, 'Arquivo grande demais (máximo 2 MB).'],
  [/mime type|invalid_mime_type/i, 'Formato de imagem não suportado. Use JPG, PNG ou WebP.'],
]

export function errorCode(error: unknown): string | null {
  const message = extractMessage(error)
  return message && /^[A-Z_]+$/.test(message) ? message : null
}

function extractMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return ''
}

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const message = extractMessage(error)
  if (!message) return fallback
  const known = businessMessages[message]
  if (known) return known
  for (const [pattern, text] of authMessages) {
    if (pattern.test(message)) return text
  }
  return fallback
}

/** Lança um erro com mensagem-código; usado pelos serviços. */
export function throwIfError<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error
  return result.data
}
