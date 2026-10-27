import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const duplicateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  subject: z.string().trim().min(2).max(250).optional(),
  body: z.string().trim().min(5).optional(),
  fromChannelId: z.string().optional(),
  copyEmail: z.boolean().default(true),
  copyRecipients: z.boolean().default(true),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = duplicateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, subject, body, fromChannelId, copyEmail, copyRecipients } = parsed.data;

    const source = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: { recipients: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source campaign not found' }, { status: 404 });
    }

    const newCampaignName = name?.trim() || `${source.name} (Copy)`;
    const newSubject = subject?.trim() || (copyEmail ? source.subject : `Subject - ${newCampaignName}`);
    const newBody = body?.trim() || (copyEmail ? source.body : `Hi {{name}},\n\n...`);
    const newFromChannelId = fromChannelId || (copyEmail ? source.fromChannelId : undefined);

    const newCampaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name: newCampaignName,
        subject: newSubject,
        body: newBody,
        fromChannelId: newFromChannelId,
        type: 'EMAIL',
        status: 'DRAFT',
      },
    });

    let recipientsCopied = 0;
    if (copyRecipients && source.recipients.length > 0) {
      const recipientData = source.recipients.map((r) => ({
        campaignId: newCampaign.id,
        email: r.email,
        name: r.name,
        company: r.company,
        status: 'PENDING',
      }));

      try {
        await prisma.campaignRecipient.createMany({
          data: recipientData,
        });
        recipientsCopied = recipientData.length;
      } catch {
        for (const r of recipientData) {
          await prisma.campaignRecipient.create({ data: r });
          recipientsCopied++;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        campaign: {
          ...newCampaign,
          totalRecipients: recipientsCopied,
          totalSent: 0,
          totalFailed: 0,
        },
        recipientsCopied,
        message: `Successfully duplicated campaign "${source.name}"`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to duplicate campaign', error);
    return NextResponse.json({ error: 'Failed to duplicate campaign' }, { status: 500 });
  }
}
