import { LegalDraft } from '../components/LegalDraft'

export default function TermsPage() {
  return (
    <LegalDraft title="Termos de uso" updated="outubro de 2026">
      <p>
        Estes termos regulam o uso da Pratuca, plataforma de cardápio digital e organização de pedidos oferecida pela MovCode a pequenos
        negócios de alimentação ("Lojistas").
      </p>
      <h2>1. O serviço</h2>
      <p>
        A Pratuca permite que o Lojista publique um cardápio digital, receba pedidos de seus clientes e organize a produção. A Pratuca não é
        marketplace, não vende alimentos, não realiza entregas e não intermedia pagamentos entre Lojista e cliente final.
      </p>
      <h2>2. Cadastro e responsabilidades do Lojista</h2>
      <ul>
        <li>Fornecer informações verdadeiras e manter seus dados de acesso em sigilo.</li>
        <li>Responder pelos produtos oferecidos, preços, qualidade, entrega, atendimento e obrigações fiscais e sanitárias.</li>
        <li>Tratar os dados pessoais de seus clientes de forma lícita, apenas para atender aos pedidos.</li>
      </ul>
      <h2>3. Assinatura</h2>
      <p>
        O plano Essencial custa R$ 39,90 por mês, sem comissão sobre pedidos, com período de teste de 7 dias. Em caso de atraso, há carência
        de 3 dias; depois, o recebimento de novos pedidos é pausado até a regularização. Os dados não são apagados por inadimplência.
      </p>
      <h2>4. Cancelamento</h2>
      <p>O Lojista pode cancelar a qualquer momento. O acesso permanece até o fim do período já pago.</p>
      <h2>5. Disponibilidade</h2>
      <p>Empregamos esforços razoáveis para manter o serviço disponível, sem garantia de funcionamento ininterrupto.</p>
      <h2>6. Alterações</h2>
      <p>Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas aos Lojistas.</p>
    </LegalDraft>
  )
}
