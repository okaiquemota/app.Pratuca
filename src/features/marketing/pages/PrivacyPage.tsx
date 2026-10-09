import { LegalDraft } from '../components/LegalDraft'

export default function PrivacyPage() {
  return (
    <LegalDraft title="Política de privacidade" updated="outubro de 2026">
      <p>Esta política descreve como a Pratuca trata dados pessoais de Lojistas e de clientes que fazem pedidos pelos cardápios.</p>
      <h2>1. Dados de Lojistas</h2>
      <ul>
        <li>Nome, e-mail e senha (armazenada de forma protegida pelo provedor de autenticação).</li>
        <li>Dados da loja: nome comercial, telefones, endereço comercial opcional, cardápio e configurações.</li>
        <li>Dados de assinatura. Dados de cartão, quando houver cobrança online, são tratados pelo gateway de pagamento, não pela Pratuca.</li>
      </ul>
      <h2>2. Dados de clientes finais</h2>
      <p>
        Para registrar um pedido, coletamos apenas nome, telefone e, quando há entrega, endereço. Esses dados ficam disponíveis somente para a
        loja onde o pedido foi feito, para atendimento do pedido. Não armazenamos dados de cartão.
      </p>
      <h2>3. Compartilhamento</h2>
      <p>
        Os dados são processados por fornecedores de infraestrutura (hospedagem, banco de dados e autenticação). Ao escolher enviar o resumo
        pelo WhatsApp, o cliente abre o aplicativo de terceiros por iniciativa própria.
      </p>
      <h2>4. Segurança</h2>
      <p>
        Os dados de cada loja são isolados por regras de acesso no banco de dados. Aplicamos medidas técnicas razoáveis, sem garantia absoluta
        contra incidentes.
      </p>
      <h2>5. Direitos e solicitações</h2>
      <p>
        Clientes finais podem pedir à loja a exclusão de seus dados; a loja dispõe de uma função para remover nome, telefone e endereço dos
        pedidos. Lojistas podem solicitar a exclusão da conta e dos dados pelos canais de suporte.
      </p>
      <h2>6. Retenção</h2>
      <p>Mantemos os dados enquanto a conta estiver ativa ou pelo prazo necessário para cumprir obrigações legais.</p>
    </LegalDraft>
  )
}
