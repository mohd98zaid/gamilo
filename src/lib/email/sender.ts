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

  return {
    transporter,
    senderEmail: userEmail,
    senderName: channel.name,
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

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html?.replace(/<[^>]*>?/gm, '') || '',
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
  };
}

/**
 * Dispatches bulk emails with template variable interpolation and anti-spam delay
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
    
    // Replace variables in subject and body
    const personalizedSubject = options.subject
      .replace(/{{name}}/gi, recipient.name || 'there')
      .replace(/{{email}}/gi, recipient.email)
      .replace(/{{company}}/gi, recipient.company || 'your team');

    const personalizedHtml = options.bodyTemplate
      .replace(/{{name}}/gi, recipient.name || 'there')
      .replace(/{{email}}/gi, recipient.email)
      .replace(/{{company}}/gi, recipient.company || 'your team');

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        text: personalizedHtml.replace(/<[^>]*>?/gm, ''),
      });

      results.push({ email: recipient.email, success: true });
    } catch (err) {
      results.push({
        email: recipient.email,
        success: false,
        error: err instanceof Error ? err.message : 'Send failed',
      });
    }

    // Delay between sends to prevent triggering rate limits / spam filters
    if (i < options.recipients.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
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
