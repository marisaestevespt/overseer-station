export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
export const ROOT_DOMAIN = "lyrata.pt";

export function slugifySubdomain(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
}

export function isValidSubdomain(s: string): boolean {
  return SUBDOMAIN_REGEX.test(s);
}

export function buildInstanceUrl(subdomain: string): string {
  return `https://${subdomain}.${ROOT_DOMAIN}`;
}

export function buildHealthCheckUrl(subdomain: string): string {
  return `${buildInstanceUrl(subdomain)}/functions/v1/health-check`;
}
