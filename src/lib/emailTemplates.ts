// Email template preview functions for Settings page
// Uses same layout as Edge Function templates for consistency

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
  phone: "+351 912 345 678",
  address: "",
  business_hours: "Seg-Sex, 9h-18h",
  website: "https://lyrata.pt",
  logo_url: "",
  instagram_url: "https://instagram.com/lyrata",
  linkedin_url: "https://linkedin.com/company/lyrata",
  facebook_url: "",
  twitter_url: "",
};

const COLORS = {
  primary: "#6e1f36",
  accent: "#8c5a3e",
  secondary: "#d4918a",
  bg: "#ffffff",
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

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: 'DM Sans', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg};">
    <tr><td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(110,31,54,0.08);">
        <tr><td style="background-color: ${COLORS.headerBg}; padding: 32px 40px; text-align: center;">
          ${logoHtml}
          <h1 style="margin: 0; font-family: 'Lora', Georgia, serif; font-size: 26px; font-weight: 600; color: #ffffff;">${branding.business_name}</h1>
        </td></tr>
        <tr><td style="background-color: ${COLORS.bg}; padding: 40px;">${content}</td></tr>
        <tr><td style="background-color: ${COLORS.footerBg}; padding: 28px 40px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${COLORS.primary}; font-family: 'Lora', Georgia, serif;">${branding.business_name}</p>
          <p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted};">${contactParts.join(" · ")}</p>
          ${branding.business_hours ? `<p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted};">🕐 ${branding.business_hours}</p>` : ""}
          ${branding.address ? `<p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted};">📍 ${branding.address}</p>` : ""}
          ${socialLinks ? `<p style="margin: 12px 0 0;">${socialLinks}</p>` : ""}
          <p style="margin: 16px 0 0; font-size: 11px; color: ${COLORS.muted};">© 2026 ${branding.business_name}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<div style="text-align: center; margin: 32px 0;">
  <a href="${url}" style="display: inline-block; background-color: ${COLORS.primary}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; font-family: 'DM Sans', Arial, sans-serif;">${text}</a>
</div>`;
}

const ts = (extra = "") => `color: ${COLORS.text}; font-size: 15px; line-height: 1.7; margin: 0 0 16px; font-family: 'DM Sans', Arial, sans-serif; ${extra}`;
const divider = `<hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;" />`;
const hl = (t: string) => `<span style="color: ${COLORS.primary}; font-weight: 600;">${t}</span>`;

function welcomeEmailHtml(b: EmailBranding): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá Maria Santos,</p>
    <p style="${ts("font-size: 17px;")}">O teu espaço de gestão ${hl("está pronto")}.</p>
    <p style="${ts()}">Criámos o teu acesso ao sistema de gestão do <strong>Café Central</strong>. A partir de agora tens um único lugar para gerir toda a operação do teu negócio.</p>
    ${btn("Aceder ao meu sistema", "#")}
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${b.business_name}</strong></p>
  `, b);
}

function sepaSetupEmailHtml(b: EmailBranding): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá Maria Santos,</p>
    <p style="${ts("font-size: 17px;")}">Falta um passo para ${hl("activar a tua subscrição")}.</p>
    <p style="${ts()}">Para activar o pagamento automático mensal por débito directo, precisamos que autorizes o acesso à tua conta bancária.</p>
    <p style="${ts()}">É um processo simples e seguro, processado pelo Stripe.</p>
    ${btn("Autorizar débito directo", "#")}
    <p style="${ts()}">Após a autorização, os pagamentos mensais serão processados automaticamente.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${b.business_name}</strong></p>
  `, b);
}

function paymentFailedEmailHtml(b: EmailBranding): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá Maria Santos,</p>
    <p style="${ts("font-size: 17px;")}">Houve um ${hl("problema com o teu pagamento")}.</p>
    <p style="${ts()}">Não conseguimos processar o pagamento da tua subscrição de <strong>Março 2026</strong>. O teu acesso mantém-se activo por mais 7 dias.</p>
    ${btn("Actualizar método de pagamento", "#")}
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se precisares de ajuda, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${b.business_name}</strong></p>
  `, b);
}

function renewalReminderEmailHtml(b: EmailBranding): string {
  return baseLayout(`
    <p style="${ts("font-size: 18px; font-weight: 500;")}">Olá Maria Santos,</p>
    <p style="${ts("font-size: 17px;")}">A tua subscrição ${hl("renova em breve")}.</p>
    <p style="${ts()}">A tua subscrição mensal do <strong>${b.business_name}</strong> será renovada a <strong>2 de Abril de 2026</strong> no valor de <strong>49€</strong>.</p>
    <p style="${ts()}">O pagamento será processado automaticamente por débito directo — não precisas de fazer nada.</p>
    <p style="${ts("font-size: 13px; color: " + COLORS.muted + ";")}">Se tiveres alguma questão, responde a este email.</p>
    ${divider}
    <p style="${ts("font-size: 14px;")}">Até já,<br/><strong>Equipa ${b.business_name}</strong></p>
  `, b);
}

// Static previews using defaults
export const templatePreviews = [
  {
    id: "welcome",
    name: "Boas-vindas e Acesso",
    description: "Enviado quando uma nova instância é criada e o acesso é configurado.",
    html: welcomeEmailHtml(DEFAULT_BRANDING),
  },
  {
    id: "sepa-setup",
    name: "Setup SEPA",
    description: "Enviado quando uma subscrição é criada e a cliente precisa de autorizar o débito directo.",
    html: sepaSetupEmailHtml(DEFAULT_BRANDING),
  },
  {
    id: "payment-failed",
    name: "Pagamento em Atraso",
    description: "Enviado quando um pagamento falha e a subscrição fica em atraso.",
    html: paymentFailedEmailHtml(DEFAULT_BRANDING),
  },
  {
    id: "renewal-reminder",
    name: "Aviso de Renovação",
    description: "Enviado 7 dias antes da renovação automática da subscrição.",
    html: renewalReminderEmailHtml(DEFAULT_BRANDING),
  },
];

// Export for dynamic preview generation
export { welcomeEmailHtml, sepaSetupEmailHtml, paymentFailedEmailHtml, renewalReminderEmailHtml };
export type { EmailBranding };
export { DEFAULT_BRANDING };
