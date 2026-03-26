// Email template generator functions for Resend
// All templates follow the brand identity: bordeaux header, bege body, warm footer

const SYSTEM_NAME = "Admin Panel";

interface WelcomeEmailData {
  ownerName: string;
  businessName: string;
  instanceUrl: string;
  systemName?: string;
}

interface SepaSetupEmailData {
  ownerName: string;
  setupUrl: string;
  systemName?: string;
}

interface PaymentFailedEmailData {
  ownerName: string;
  monthYear: string;
  updatePaymentUrl: string;
  systemName?: string;
}

interface RenewalReminderEmailData {
  ownerName: string;
  renewalDate: string;
  amount: string;
  systemName?: string;
}

function baseLayout(content: string, systemName: string = SYSTEM_NAME): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${systemName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #e8ddd0; font-family: 'DM Sans', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8ddd0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #6e1f2b; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 600; color: #ffffff; letter-spacing: 1px;">${systemName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #f2e9de; padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #d6c9b8; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8b5e3c; font-family: 'DM Sans', Arial, sans-serif;">
                Enviado por ${systemName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(text: string, url: string): string {
  return `
<div style="text-align: center; margin: 32px 0;">
  <a href="${url}" style="display: inline-block; background-color: #6e1f2b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; font-family: 'DM Sans', Arial, sans-serif; letter-spacing: 0.3px;">
    ${text}
  </a>
</div>`;
}

function textStyle(extra: string = ""): string {
  return `color: #2a2a2a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; font-family: 'DM Sans', Arial, sans-serif; ${extra}`;
}

export function welcomeEmailHtml(data: WelcomeEmailData): string {
  const sn = data.systemName || SYSTEM_NAME;
  const content = `
    <p style="${textStyle("font-size: 18px; font-weight: 500;")}">Olá ${data.ownerName},</p>
    <p style="${textStyle("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">O teu espaço de gestão está pronto.</p>
    <p style="${textStyle()}">
      Criámos o teu acesso ao sistema de gestão do <strong>${data.businessName}</strong>.
      A partir de agora tens um único lugar para gerir toda a operação do teu negócio.
    </p>
    ${buttonHtml("Aceder ao meu sistema", data.instanceUrl)}
    <p style="${textStyle("font-size: 13px; color: #8b5e3c;")}">
      Se tiveres alguma questão, responde a este email.
    </p>
    <hr style="border: none; border-top: 1px solid #d8a3a0; margin: 24px 0;" />
    <p style="${textStyle("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `;
  return baseLayout(content, sn);
}

export function sepaSetupEmailHtml(data: SepaSetupEmailData): string {
  const sn = data.systemName || SYSTEM_NAME;
  const content = `
    <p style="${textStyle("font-size: 18px; font-weight: 500;")}">Olá ${data.ownerName},</p>
    <p style="${textStyle("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">Falta um passo para activar a tua subscrição.</p>
    <p style="${textStyle()}">
      Para activar o pagamento automático mensal por débito directo, precisamos que autorizes o acesso à tua conta bancária.
    </p>
    <p style="${textStyle()}">
      É um processo simples e seguro, processado pelo Stripe.
    </p>
    ${buttonHtml("Autorizar débito directo", data.setupUrl)}
    <p style="${textStyle()}">
      Após a autorização, os pagamentos mensais serão processados automaticamente. Não precisas de fazer nada mais.
    </p>
    <hr style="border: none; border-top: 1px solid #d8a3a0; margin: 24px 0;" />
    <p style="${textStyle("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `;
  return baseLayout(content, sn);
}

export function paymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const sn = data.systemName || SYSTEM_NAME;
  const content = `
    <p style="${textStyle("font-size: 18px; font-weight: 500;")}">Olá ${data.ownerName},</p>
    <p style="${textStyle("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">Houve um problema com o teu pagamento.</p>
    <p style="${textStyle()}">
      Não conseguimos processar o pagamento da tua subscrição de <strong>${data.monthYear}</strong>.
      O teu acesso mantém-se activo por mais 7 dias.
    </p>
    <p style="${textStyle()}">
      Para evitar a suspensão do acesso, por favor actualiza o teu método de pagamento.
    </p>
    ${buttonHtml("Actualizar método de pagamento", data.updatePaymentUrl)}
    <p style="${textStyle("font-size: 13px; color: #8b5e3c;")}">
      Se precisares de ajuda, responde a este email.
    </p>
    <hr style="border: none; border-top: 1px solid #d8a3a0; margin: 24px 0;" />
    <p style="${textStyle("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `;
  return baseLayout(content, sn);
}

export function renewalReminderEmailHtml(data: RenewalReminderEmailData): string {
  const sn = data.systemName || SYSTEM_NAME;
  const content = `
    <p style="${textStyle("font-size: 18px; font-weight: 500;")}">Olá ${data.ownerName},</p>
    <p style="${textStyle("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">A tua subscrição renova em breve.</p>
    <p style="${textStyle()}">
      A tua subscrição mensal do <strong>${sn}</strong> será renovada a <strong>${data.renewalDate}</strong> no valor de <strong>${data.amount}€</strong>.
    </p>
    <p style="${textStyle()}">
      O pagamento será processado automaticamente por débito directo — não precisas de fazer nada.
    </p>
    <p style="${textStyle("font-size: 13px; color: #8b5e3c;")}">
      Se tiveres alguma questão, responde a este email.
    </p>
    <hr style="border: none; border-top: 1px solid #d8a3a0; margin: 24px 0;" />
    <p style="${textStyle("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `;
  return baseLayout(content, sn);
}

// Preview data for Settings page
export const templatePreviews = [
  {
    id: "welcome",
    name: "Boas-vindas e Acesso",
    description: "Enviado quando uma nova instância é criada e o acesso é configurado.",
    html: welcomeEmailHtml({
      ownerName: "Maria Santos",
      businessName: "Café Central",
      instanceUrl: "https://app.exemplo.com/cafe-central",
    }),
  },
  {
    id: "sepa-setup",
    name: "Setup SEPA",
    description: "Enviado quando uma subscrição é criada e a cliente precisa de autorizar o débito directo.",
    html: sepaSetupEmailHtml({
      ownerName: "Maria Santos",
      setupUrl: "https://checkout.stripe.com/setup/example",
    }),
  },
  {
    id: "payment-failed",
    name: "Pagamento em Atraso",
    description: "Enviado quando um pagamento falha e a subscrição fica em atraso.",
    html: paymentFailedEmailHtml({
      ownerName: "Maria Santos",
      monthYear: "Março 2026",
      updatePaymentUrl: "https://billing.stripe.com/p/example",
    }),
  },
  {
    id: "renewal-reminder",
    name: "Aviso de Renovação",
    description: "Enviado 7 dias antes da renovação automática da subscrição.",
    html: renewalReminderEmailHtml({
      ownerName: "Maria Santos",
      renewalDate: "2 de Abril de 2026",
      amount: "49",
    }),
  },
];
