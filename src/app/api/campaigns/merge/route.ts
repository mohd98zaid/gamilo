import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const mergeCampaignsSchema = z.object({
  sourceCampaignIds: z.array(z.string().min(1)).min(2, 'Select at least 2 campaigns to merge'),
  targetCampaignId: z.string().optional(),
  newCampaignName: z.string().trim().max(100).optional(),
  templateCampaignId: z.string().optional(),
  recipientStatusFilter: z.enum(['ALL', 'PENDING', 'SENT', 'FAILED']).default('ALL'),
  resetStatusToPending: z.boolean().default(true),
  deleteSourceCampaigns: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = mergeCampaignsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const {
      sourceCampaignIds,
      targetCampaignId,
      newCampaignName,
      templateCampaignId,
      recipientStatusFilter,
      resetStatusToPending,
      deleteSourceCampaigns,
    } = parsed.data;

    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: sourceCampaignIds }, workspaceId },
      include: {
        recipients: {
          where: recipientStatusFilter === 'ALL' ? undefined : { status: recipientStatusFilter },
          orderBy: { email: 'asc' },
        },
      },
    });

    if (campaigns.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid campaigns from this workspace are required to merge' },
        { status: 400 }
      );
    }

    const template =
      (templateCampaignId ? campaigns.find((c) => c.id === templateCampaignId) : null) ||
      (targetCampaignId ? campaigns.find((c) => c.id === targetCampaignId) : null) ||
      campaigns[0];

    const seenEmails = new Set<string>();
    const allRecipientsToMerge: Array<{
      email: string;
      name: string | null;
      company: string | null;
      status: string;
    }> = [];
    let duplicatesCount = 0;

    for (const camp of campaigns) {
      for (const r of camp.recipients) {
        const normalized = r.email.trim().toLowerCase();
        if (seenEmails.has(normalized)) {
          duplicatesCount++;
          continue;
        }
        seenEmails.add(normalized);
        allRecipientsToMerge.push({
          email: r.email.trim(),
          name: r.name,
          company: r.company,
          status: resetStatusToPending ? 'PENDING' : r.status,
        });
      }
    }

    let finalCampaign: any;

    if (targetCampaignId) {
      const target = await prisma.campaign.findFirst({
        where: { id: targetCampaignId, workspaceId },
        include: { recipients: true },
      });

      if (!target) {
        return NextResponse.json({ error: 'Target campaign not found' }, { status: 404 });
      }

      const existingEmails = new Set(target.recipients.map((r) => r.email.trim().toLowerCase()));
      const newRecipients = allRecipientsToMerge.filter(
        (r) => !existingEmails.has(r.email.toLowerCase())
      );
      duplicatesCount += allRecipientsToMerge.length - newRecipients.length;

      if (newRecipients.length > 0) {
        const recipientData = newRecipients.map((r) => ({
          campaignId: target.id,
          email: r.email,
          name: r.name,
          company: r.company,
          status: r.status,
        }));

        try {
          await prisma.campaignRecipient.createMany({ data: recipientData });
        } catch {
          for (const r of recipientData) {
            await prisma.campaignRecipient.create({ data: r });
          }
        }
      }

      finalCampaign = {
        id: target.id,
        name: target.name,
        totalRecipients: target.recipients.length + newRecipients.length,
      };
    } else {
      const defaultName = `${template.name} + ${campaigns.length - 1} more (Merged)`;
      const mergedName = newCampaignName?.trim() || defaultName;

      const created = await prisma.campaign.create({
        data: {
          workspaceId,
          name: mergedName,
          subject: template.subject,
          body: template.body,
          fromChannelId: template.fromChannelId,
          type: template.type || 'EMAIL',
          status: 'DRAFT',
        },
      });

      if (allRecipientsToMerge.length > 0) {
        const recipientData = allRecipientsToMerge.map((r) => ({
          campaignId: created.id,
          email: r.email,
          name: r.name,
          company: r.company,
          status: r.status,
        }));

        try {
          await prisma.campaignRecipient.createMany({ data: recipientData });
        } catch {
          for (const r of recipientData) {
            await prisma.campaignRecipient.create({ data: r });
          }
        }
      }

      finalCampaign = {
        id: created.id,
        name: created.name,
        totalRecipients: allRecipientsToMerge.length,
      };
    }

    if (deleteSourceCampaigns) {
      const idsToDelete = targetCampaignId
        ? sourceCampaignIds.filter((id) => id !== targetCampaignId)
        : sourceCampaignIds;

      if (idsToDelete.length > 0) {
        await prisma.campaign.deleteMany({
          where: { id: { in: idsToDelete }, workspaceId },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        campaign: finalCampaign,
        totalRecipients: finalCampaign.totalRecipients,
        mergedFromCount: campaigns.length,
        duplicatesRemoved: duplicatesCount,
        message: `Successfully merged ${campaigns.length} campaigns into "${finalCampaign.name}" (${finalCampaign.totalRecipients} total recipients)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to merge campaigns', error);
    return NextResponse.json({ error: 'Failed to merge campaigns' }, { status: 500 });
  }
}
