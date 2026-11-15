import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const splitCampaignSchema = z.object({
  mode: z.enum(['BATCH_SIZE', 'NUM_PARTS', 'STATUS']).default('BATCH_SIZE'),
  batchSize: z.number().int().min(1).max(10000).optional(),
  numParts: z.number().int().min(2).max(100).optional(),
  statuses: z.array(z.string()).optional(),
  namePrefix: z.string().trim().max(100).optional(),
  copyEmail: z.boolean().default(true),
  moveRecipients: z.boolean().default(false),
  recipientStatusFilter: z.enum(['ALL', 'PENDING', 'SENT', 'FAILED']).default('ALL'),
});

interface RecipientItem {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
}

interface SplitGroup {
  suffix: string;
  recipients: RecipientItem[];
}

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
    const parsed = splitCampaignSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const {
      mode,
      batchSize,
      numParts,
      statuses,
      namePrefix,
      copyEmail,
      moveRecipients,
      recipientStatusFilter,
    } = parsed.data;

    const source = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        recipients: {
          where: recipientStatusFilter === 'ALL' ? undefined : { status: recipientStatusFilter },
          orderBy: { email: 'asc' },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source campaign not found' }, { status: 404 });
    }

    if (source.recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found to split in this campaign matching criteria' },
        { status: 400 }
      );
    }

    const groups: SplitGroup[] = [];

    if (mode === 'BATCH_SIZE') {
      const size = Math.max(1, batchSize || 50);
      for (let i = 0; i < source.recipients.length; i += size) {
        const chunk = source.recipients.slice(i, i + size);
        const partNum = Math.floor(i / size) + 1;
        groups.push({
          suffix: `Part ${partNum}`,
          recipients: chunk,
        });
      }
    } else if (mode === 'NUM_PARTS') {
      const parts = Math.max(2, Math.min(numParts || 2, source.recipients.length));
      const total = source.recipients.length;
      let start = 0;
      for (let i = 0; i < parts; i++) {
        const remainingParts = parts - i;
        const remainingItems = total - start;
        const partSize = Math.ceil(remainingItems / remainingParts);
        const chunk = source.recipients.slice(start, start + partSize);
        start += partSize;
        if (chunk.length > 0) {
          groups.push({
            suffix: `Part ${i + 1}`,
            recipients: chunk,
          });
        }
      }
    } else if (mode === 'STATUS') {
      const statusMap = new Map<string, RecipientItem[]>();
      for (const r of source.recipients) {
        if (!statuses || statuses.length === 0 || statuses.includes(r.status)) {
          if (!statusMap.has(r.status)) statusMap.set(r.status, []);
          statusMap.get(r.status)!.push(r);
        }
      }
      for (const [status, chunk] of statusMap.entries()) {
        if (chunk.length > 0) {
          const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          groups.push({
            suffix: `${displayStatus} (${chunk.length})`,
            recipients: chunk,
          });
        }
      }
    }

    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'No split groups could be created from the selected options' },
        { status: 400 }
      );
    }

    const baseName = namePrefix?.trim() || source.name;
    const createdCampaigns = [];
    const movedRecipientIds: string[] = [];

    for (const group of groups) {
      const campaignName = `${baseName} - ${group.suffix}`;
      const newCamp = await prisma.campaign.create({
        data: {
          workspaceId,
          name: campaignName,
          subject: copyEmail ? source.subject : `Subject - ${campaignName}`,
          body: copyEmail ? source.body : `Hi {{name}},\n\n...`,
          fromChannelId: copyEmail ? source.fromChannelId : undefined,
          type: source.type || 'EMAIL',
          status: 'DRAFT',
        },
      });

      const recipientData = group.recipients.map((r) => ({
        campaignId: newCamp.id,
        email: r.email,
        name: r.name,
        company: r.company,
        status: 'PENDING',
      }));

      try {
        await prisma.campaignRecipient.createMany({ data: recipientData });
      } catch {
        for (const r of recipientData) {
          await prisma.campaignRecipient.create({ data: r });
        }
      }

      if (moveRecipients) {
        movedRecipientIds.push(...group.recipients.map((r) => r.id));
      }

      createdCampaigns.push({
        id: newCamp.id,
        name: newCamp.name,
        totalRecipients: recipientData.length,
      });
    }

    if (moveRecipients && movedRecipientIds.length > 0) {
      await prisma.campaignRecipient.deleteMany({
        where: { id: { in: movedRecipientIds } },
      });
    }

    const totalRecipientsSplit = groups.reduce((acc, g) => acc + g.recipients.length, 0);

    return NextResponse.json(
      {
        success: true,
        createdCampaigns,
        totalCreated: createdCampaigns.length,
        totalRecipientsSplit,
        message: `Successfully split "${source.name}" into ${createdCampaigns.length} campaigns (${totalRecipientsSplit} recipients)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to split campaign', error);
    return NextResponse.json({ error: 'Failed to split campaign' }, { status: 500 });
  }
}
