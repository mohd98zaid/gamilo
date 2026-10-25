import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decryptFromString } from '@/lib/encryption';

export interface SendEmailOptions {
  workspaceId: string;
  channelId?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface BulkEmailRecipient {
  id?: string;
  email: string;
  name?: string | null;
  company?: string | null;
}

export interface SendBulkOptions {
  workspaceId: string;
  channelId?: string;
  subject: string;
  bodyTemplate: string;
  recipients: BulkEmailRecipient[];
  delayBetweenEmailsMs?: number;
}

/**
 * Resolves Spintax dynamic text variations (e.g. "{Hi|Hello|Hey}") to randomize sentence structure.
 * Supports nested spintax patterns like "{Hi {there|friend}|Hello}".
 * Ignores braces without a pipe symbol to safeguard single/double curly syntax like {{name}}.
 */
export function parseSpintax(text: string): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}]+?\|[^{}]+?)\}/g;
  let result = text;
  let loops = 0;
  while (spintaxRegex.test(result) && loops < 10) {
    result = result.replace(spintaxRegex, (_match, group) => {
      const options = group.split('|');
      const chosen = options[Math.floor(Math.random() * options.length)];
      return chosen !== undefined ? chosen : '';
    });
    loops++;
  }
  return result;
}

/**
 * Cleans a channel name into a human display name suitable for RFC 5322 From headers
 * (e.g. "Mohammad Zaid (mohd98zaid@gmail.com)" -> "Mohammad Zaid")
 */
export function extractCleanSenderName(rawName?: string | null, email?: string): string {
  if (!rawName) return email ? email.split('@')[0] : 'Sender';

  // Strip parenthesized or bracketed email patterns like (user@domain.com) or <user@domain.com>
  let cleaned = rawName.replace(/[\(\[\<].*?@.*?[\)\]\>]/g, '').trim();

  // Strip trailing raw emails
  cleaned = cleaned.replace(/\s+[^\s@]+@[^\s@]+\.[^\s@]+/g, '').trim();

  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  if (!cleaned || cleaned.includes('@')) {
    return email ? email.split('@')[0] : 'Sender';
  }

  return cleaned;
}

/**
 * Converts raw template text or markdown into responsive HTML email with clickable hyperlinks
 */
export function formatEmailBodyToHtml(content: string): string {
  if (!content) return '';

  if (/<html|<body/i.test(content)) {
    return content;
  }

  // 1. Convert markdown links [Text](URL) into <a href="URL">Text</a>
  let html = content.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/gi,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$1</a>'
  );

  // 2. Convert standalone raw URLs (not already part of an href tag) to clickable links
  html = html.replace(
    /(^|[\s>(])((?:https?:\/\/)[^\s<)]+)/gi,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">$2</a>'
  );

  // 3. Convert paragraphs & linebreaks
  const paragraphs = html.split(/\r?\n\s*\r?\n/);
  const formattedHtml = paragraphs
    .map(
      (para) =>
        `<p style="margin: 0 0 16px 0; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b;">${para.replace(
          /\r?\n/g,
          '<br />'
        )}</p>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto;">
    ${formattedHtml}
  </div>
</body>
</html>`.trim();
}

/**
 * Resolves a channel and creates a configured nodemailer transporter
 */
export async function getEmailTransporter(workspaceId: string, channelId?: string) {
  let channel = null;

  if (channelId) {
    channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId, isActive: true },
    });
  }

  if (!channel) {
    // Find the first active email or gmail channel for the workspace
    channel = await prisma.channel.findFirst({
      where: {
        workspaceId,
        isActive: true,
        platform: { in: ['GMAIL', 'EMAIL'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!channel) {
    throw new Error('No active Gmail or Email channel connected for this workspace');
  }

  let plainPassword = '';
  try {
    if (channel.accessToken.startsWith('enc:v1:')) {
      plainPassword = decryptFromString(channel.accessToken);
    } else {
      plainPassword = channel.accessToken;
    }
  } catch {
    plainPassword = channel.accessToken;
  }

  const cleanPass = plainPassword.replace(/\s+/g, '');
  const userEmail = channel.platformId;

  // Configure transporter based on platform
  let transporter;
  if (channel.platform === 'GMAIL') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: userEmail,
        pass: cleanPass,
      },
    });
  } else {
    // Custom SMTP
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: userEmail,
        pass: cleanPass,
      },
    });
  }

  const cleanSenderName = extractCleanSenderName(channel.name, userEmail);

  return {
    transporter,
    senderEmail: userEmail,
    senderName: cleanSenderName,
    channel,
  };
}

/**
 * Sends a single email using the workspace's connected email channel
 */
export async function sendEmail(options: SendEmailOptions) {
  const { transporter, senderEmail, senderName } = await getEmailTransporter(
    options.workspaceId,
    options.channelId
  );

  const htmlBody = options.html || formatEmailBodyToHtml(options.text || '');

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: options.to,
    replyTo: senderEmail,
    subject: options.subject,
    text: options.text || options.html?.replace(/<[^>]*>?/gm, '') || '',
    html: htmlBody,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
  };
}

/**
 * Dispatches bulk emails with template variable interpolation, hyperlinking, and anti-spam delay
 */
export async function sendBulkEmails(options: SendBulkOptions) {
  const { transporter, senderEmail, senderName } = await getEmailTransporter(
    options.workspaceId,
    options.channelId
  );

  const delayMs = options.delayBetweenEmailsMs ?? 500;
  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < options.recipients.length; i++) {
    const recipient = options.recipients[i];
    
    // 1. Replace variables in subject and body
    const interpolatedSubject = options.subject
      .replace(/{{name}}/gi, recipient.name || 'there')
      .replace(/{{email}}/gi, recipient.email)
      .replace(/{{company}}/gi, recipient.company || 'your team');

    const interpolatedBody = options.bodyTemplate
      .replace(/{{name}}/gi, recipient.name || 'there')
      .replace(/{{email}}/gi, recipient.email)
      .replace(/{{company}}/gi, recipient.company || 'your team');

    // 2. Resolve Spintax dynamic alternatives per recipient to prevent content fingerprinting
    const finalSubject = parseSpintax(interpolatedSubject);
    const finalBodyRaw = parseSpintax(interpolatedBody);

    const personalizedHtml = formatEmailBodyToHtml(finalBodyRaw);
    const plainText = finalBodyRaw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipient.email,
        replyTo: senderEmail,
        subject: finalSubject,
        html: personalizedHtml,
        text: plainText,
      });

      results.push({ email: recipient.email, success: true });
    } catch (err) {
      results.push({
        email: recipient.email,
        success: false,
        error: err instanceof Error ? err.message : 'Send failed',
      });
    }

    // Anti-bot randomized delay between sends (±35% jitter) to mimic human behavior
    if (i < options.recipients.length - 1 && delayMs > 0) {
      const minDelay = Math.max(100, Math.floor(delayMs * 0.65));
      const maxExtra = Math.floor(delayMs * 0.7);
      const randomizedJitter = minDelay + Math.floor(Math.random() * maxExtra);
      await new Promise((resolve) => setTimeout(resolve, randomizedJitter));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return {
    total: options.recipients.length,
    sent: successCount,
    failed: failCount,
    results,
  };
}
