/**
 * contact-infer.ts
 *
 * Automatically infers human Name and Company Name from email addresses
 * when they are missing in bulk contact lists or CSVs.
 */

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'rediffmail.com',
  'fastmail.com',
]);

const ROLE_BASED_NAMES: Record<string, string> = {
  hiring: 'Hiring Team',
  careers: 'Hiring Team',
  jobs: 'Hiring Team',
  talent: 'Talent Acquisition Team',
  recruiting: 'Recruiting Team',
  recruitment: 'Recruitment Team',
  hr: 'HR Team',
  support: 'Support Team',
  help: 'Support Team',
  care: 'Customer Care Team',
  info: 'Team',
  contact: 'Team',
  hello: 'Team',
  hi: 'Team',
  team: 'Team',
  sales: 'Sales Team',
  partnerships: 'Partnerships Team',
  biz: 'Business Development Team',
  marketing: 'Marketing Team',
  press: 'Media Team',
  media: 'Media Team',
  founder: 'Founder',
  founders: 'Founding Team',
  ceo: 'Leadership Team',
  admin: 'Admin Team',
};

const BRAND_OVERRIDES: Record<string, string> = {
  ibm: 'IBM',
  tcs: 'TCS',
  aws: 'AWS',
  meta: 'Meta',
  openai: 'OpenAI',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  apple: 'Apple',
  google: 'Google',
  microsoft: 'Microsoft',
  uber: 'Uber',
  airbnb: 'Airbnb',
  stripe: 'Stripe',
  netflix: 'Netflix',
  nvidia: 'NVIDIA',
  amd: 'AMD',
  intel: 'Intel',
  hp: 'HP',
  dell: 'Dell',
  bbc: 'BBC',
  cnn: 'CNN',
  accenture: 'Accenture',
  infosys: 'Infosys',
  wipro: 'Wipro',
};

/**
 * Infers missing Name and Company from an email address.
 *
 * Examples:
 * - "alex.turner@stripe.com" -> { name: "Alex Turner", company: "Stripe" }
 * - "mohd98zaid@gmail.com"  -> { name: "Mohd Zaid", company: undefined }
 * - "hiring@figma.com"       -> { name: "Hiring Team", company: "Figma" }
 */
export function inferContactDetails(
  email: string,
  explicitName?: string | null,
  explicitCompany?: string | null
): { email: string; name?: string; company?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const atIndex = cleanEmail.indexOf('@');

  if (atIndex === -1) {
    return {
      email: cleanEmail,
      name: explicitName?.trim() || undefined,
      company: explicitCompany?.trim() || undefined,
    };
  }

  const username = cleanEmail.slice(0, atIndex);
  const domain = cleanEmail.slice(atIndex + 1);

  // 1. Resolve Company
  let inferredCompany = explicitCompany?.trim() || undefined;
  if (!inferredCompany) {
    if (!GENERIC_EMAIL_DOMAINS.has(domain)) {
      // Remove common domain endings
      let core = domain
        .replace(/\.(co|gov|ac|edu)\.[a-z]{2}$/i, '')
        .replace(/\.(com|org|net|io|ai|co|app|dev|tech|inc|ltd|edu|gov|global|cloud|in|us|uk|de|fr|ca|jp)$/i, '')
        .replace(/\.[a-z]{2,4}$/i, '');

      // Handle subdomains (e.g. mail.corp.company -> company)
      const domainParts = core.split('.');
      core = domainParts[domainParts.length - 1];

      if (core && core.length >= 2) {
        const lower = core.toLowerCase();
        if (BRAND_OVERRIDES[lower]) {
          inferredCompany = BRAND_OVERRIDES[lower];
        } else if (core.length <= 3) {
          inferredCompany = core.toUpperCase();
        } else {
          inferredCompany = core
            .split(/[-_]/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
      }
    }
  }

  // 2. Resolve Name
  let inferredName = explicitName?.trim() || undefined;
  if (!inferredName) {
    const roleKey = username.toLowerCase();
    if (ROLE_BASED_NAMES[roleKey]) {
      inferredName = ROLE_BASED_NAMES[roleKey];
    } else {
      // Clean up compound patterns like "mohd98zaid" -> "mohd", "zaid"
      const tokens = username
        .replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)/g, '$1 $3') // e.g. mohd98zaid -> mohd zaid
        .replace(/\d+/g, ' ') // remove stray numbers e.g. alex123 -> alex
        .split(/[._\-+\s]+/)
        .filter((t) => t.length > 0);

      if (tokens.length > 0) {
        inferredName = tokens
          .map((t) => {
            const lower = t.toLowerCase();
            if (lower === 'mohd' || lower === 'md') return 'Mohd';
            return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
          })
          .join(' ');
      }
    }
  }

  return {
    email: cleanEmail,
    name: inferredName || undefined,
    company: inferredCompany || undefined,
  };
}
