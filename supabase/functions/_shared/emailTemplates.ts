// Shared email template functions for Edge Functions
// Templates fetch branding from email_settings table dynamically

interface EmailBranding {
  business_name: string;
  contact_email: string;
  phone: string;
  address: string;
  business_hours: string;
  website: string;
  logo_url: string;
  instagram_url: string;
  linkedin_url: string;
  facebook_url: string;
  twitter_url: string;
}

const DEFAULT_BRANDING: EmailBranding = {
  business_name: "Lyrata",
  contact_email: "suporte@lyrata.pt",
  phone: "",
  address: "",
  business_hours: "Seg-Sex, 9h-18h",
  website: "https://lyrata.pt",
  logo_url: "",
  instagram_url: "",
  linkedin_url: "",
  facebook_url: "",
  twitter_url: "",
};

// Brand colors (bordô palette)
const COLORS = {
  primary: "#6e1f36",       // bordô 351 56% 28%
  accent: "#8c5a3e",        // castanho quente 26 40% 39%
  secondary: "#d4918a",     // rosa suave 3 42% 74%
  bg: "#ffffff",            // email body always white
  text: "#2a2a2a",
  muted: "#8b7a6b",
  border: "#e8ddd0",
  footerBg: "#f8f4f0",
  headerBg: "#6e1f36",
};

function socialIcon(url: string, label: string): string {
  if (!url) return "";
  return `<a href="${url}" style="display: inline-block; margin: 0 6px; color: ${COLORS.muted}; text-decoration: none; font-size: 13px;">${label}</a>`;
}

function baseLayout(content: string, branding: EmailBranding): string {
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${branding.business_name}" style="max-height: 48px; max-width: 200px; margin-bottom: 12px;" /><br/>`
    : "";

  const socialLinks = [
    socialIcon(branding.instagram_url, "Instagram"),
    socialIcon(branding.linkedin_url, "LinkedIn"),
    socialIcon(branding.facebook_url, "Facebook"),
    socialIcon(branding.twitter_url, "X"),
  ].filter(Boolean).join(" · ");

  const contactParts = [branding.contact_email];
  if (branding.phone) contactParts.push(branding.phone);
  const contactLine = contactParts.join(" · ");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${branding.business_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: 'DM Sans', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(110,31,54,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${COLORS.headerBg}; padding: 32px 40px; text-align: center;">
              ${logoHtml}
              <h1 style="margin: 0; font-family: 'Lora', Georgia, serif; font-size: 26px; font-weight: 600; color: #ffffff; letter-spacing: 0.5px;">${branding.business_name}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: ${COLORS.bg}; padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.footerBg}; padding: 28px 40px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${COLORS.primary}; font-family: 'Lora', Georgia, serif;">${branding.business_name}</p>
              <p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted}; font-family: 'DM Sans', Arial, sans-serif;">${contactLine}</p>
              ${branding.business_hours ? `<p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted}; font-family: 'DM Sans', Arial, sans-serif;">🕐 ${branding.business_hours}</p>` : ""}
              ${branding.address ? `<p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted}; font-family: 'DM Sans', Arial, sans-serif;">📍 ${branding.address}</p>` : ""}
              ${socialLinks ? `<p style="margin: 12px 0 0; font-size: 12px;">${socialLinks}</p>` : ""}
              <p style="margin: 16px 0 0; font-size: 11px; color: ${COLORS.muted}; font-family: 'DM Sans', Arial, sans-serif;">© ${new Date().getFullYear()} ${branding.business_name}. Todos os direitos reservados.</p>
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
  <a href="${url}" style="display: inline-block; background-color: ${COLORS.primary}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; font-family: 'DM Sans', Arial, sans-serif; letter-spacing: 0.3px;">
    ${text}
  </a>
</div>`;
}

const ts = (extra = "") => `color: ${COLORS.text}; font-size: 15px; line-height: 1.7; margin: 0 0 16px; font-family: 'DM Sans', Arial, sans-serif; ${extra}`;
const divider = `<hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;" />`;
const highlight = (text: string) => `<span style="color: ${COLORS.primary}; font-weight: 600;">${text}</span>`;

export function welcomeEmail(ownerName: string, businessName: string, instanceUrl: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px;")}">O teu espaço de gestão ${highlight("está pronto")}.</p>
    <p style="${ts()}">Criámos o teu acesso ao sistema de gestão do <strong>${businessName}</strong>. A partir de agora tens um único lugar para gerir toda a operação do teu negócio.</p>
    ${btn("Aceder ao meu sistema", instanceUrl)}
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${branding.business_name}</strong></p>
  `, branding);
}

export function sepaSetupEmail(ownerName: string, setupUrl: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px;")}">Falta um passo para ${highlight("activar a tua subscrição")}.</p>
    <p style="${ts()}">Para activar o pagamento automático mensal por débito directo, precisamos que autorizes o acesso à tua conta bancária.</p>
    <p style="${ts()}">É um processo simples e seguro, processado pelo Stripe.</p>
    ${btn("Autorizar débito directo", setupUrl)}
    <p style="${ts()}">Após a autorização, os pagamentos mensais serão processados automaticamente. Não precisas de fazer nada mais.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${branding.business_name}</strong></p>
  `, branding);
}

export function paymentFailedEmail(ownerName: string, monthYear: string, updatePaymentUrl: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px;")}">Houve um ${highlight("problema com o teu pagamento")}.</p>
    <p style="${ts()}">Não conseguimos processar o pagamento da tua subscrição de <strong>${monthYear}</strong>. O teu acesso mantém-se activo por mais 7 dias.</p>
    <p style="${ts()}">Para evitar a suspensão do acesso, por favor actualiza o teu método de pagamento.</p>
    ${btn("Actualizar método de pagamento", updatePaymentUrl)}
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se precisares de ajuda, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${branding.business_name}</strong></p>
  `, branding);
}

export function renewalReminderEmail(ownerName: string, renewalDate: string, amount: string, branding: EmailBranding = DEFAULT_BRANDING): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá ${ownerName},</p>
    <p style="${ts("font-size: 17px;")}">A tua subscrição ${highlight("renova em breve")}.</p>
    <p style="${ts()}">A tua subscrição mensal do <strong>${branding.business_name}</strong> será renovada a <strong>${renewalDate}</strong> no valor de <strong>${amount}€</strong>.</p>
    <p style="${ts()}">O pagamento será processado automaticamente por débito directo — não precisas de fazer nada.</p>
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${branding.business_name}</strong></p>
  `, branding);
}

export type { EmailBranding };
export { DEFAULT_BRANDING };
