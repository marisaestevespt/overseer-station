// Shared email template functions for Edge Functions
// Brand: bordeaux header, bege body, warm footer

const SYSTEM_NAME = Deno.env.get("SYSTEM_NAME") || "Marisa Esteves";

function baseLayout(content: string, systemName: string = SYSTEM_NAME): string {
  return `<!DOCTYPE html>
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
          <tr>
            <td style="background-color: #6e1f2b; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 600; color: #ffffff; letter-spacing: 1px;">${systemName}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f2e9de; padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color: #d6c9b8; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8b5e3c; font-family: 'DM Sans', Arial, sans-serif;">Enviado por ${systemName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<div style="text-align: center; margin: 32px 0;">
  <a href="${url}" style="display: inline-block; background-color: #6e1f2b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; font-family: 'DM Sans', Arial, sans-serif;">
    ${text}
  </a>
</div>`;
}

const ts = (extra = "") => `color: #2a2a2a; font-size: 15px; line-height: 1.7; margin: 0 0 16px; font-family: 'DM Sans', Arial, sans-serif; ${extra}`;
const divider = `<hr style="border: none; border-top: 1px solid #d8a3a0; margin: 24px 0;" />`;

export function welcomeEmail(ownerName: string, businessName: string, instanceUrl: string): string {
  const sn = SYSTEM_NAME;
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">O teu espaço de gestão está pronto.</p>
    <p style="${ts()}">Criámos o teu acesso ao sistema de gestão do <strong>${businessName}</strong>. A partir de agora tens um único lugar para gerir toda a operação do teu negócio.</p>
    ${btn("Aceder ao meu sistema", instanceUrl)}
    <p style="${ts("font-size: 13px; color: #8b5e3c;")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `, sn);
}

export function sepaSetupEmail(ownerName: string, setupUrl: string): string {
  const sn = SYSTEM_NAME;
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">Falta um passo para activar a tua subscrição.</p>
    <p style="${ts()}">Para activar o pagamento automático mensal por débito directo, precisamos que autorizes o acesso à tua conta bancária.</p>
    <p style="${ts()}">É um processo simples e seguro, processado pelo Stripe.</p>
    ${btn("Autorizar débito directo", setupUrl)}
    <p style="${ts()}">Após a autorização, os pagamentos mensais serão processados automaticamente. Não precisas de fazer nada mais.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `, sn);
}

export function paymentFailedEmail(ownerName: string, monthYear: string, updatePaymentUrl: string): string {
  const sn = SYSTEM_NAME;
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">Houve um problema com o teu pagamento.</p>
    <p style="${ts()}">Não conseguimos processar o pagamento da tua subscrição de <strong>${monthYear}</strong>. O teu acesso mantém-se activo por mais 7 dias.</p>
    <p style="${ts()}">Para evitar a suspensão do acesso, por favor actualiza o teu método de pagamento.</p>
    ${btn("Actualizar método de pagamento", updatePaymentUrl)}
    <p style="${ts("font-size: 13px; color: #8b5e3c;")}">Se precisares de ajuda, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `, sn);
}

export function renewalReminderEmail(ownerName: string, renewalDate: string, amount: string): string {
  const sn = SYSTEM_NAME;
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px; font-weight: 600; color: #6e1f2b;")}">A tua subscrição renova em breve.</p>
    <p style="${ts()}">A tua subscrição mensal do <strong>${sn}</strong> será renovada a <strong>${renewalDate}</strong> no valor de <strong>${amount}€</strong>.</p>
    <p style="${ts()}">O pagamento será processado automaticamente por débito directo — não precisas de fazer nada.</p>
    <p style="${ts("font-size: 13px; color: #8b5e3c;")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>${sn}</strong></p>
  `, sn);
}
