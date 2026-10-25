import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const recipientItemSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().optional(),
  company: z.string().trim().optional(),
});

const addRecipientsSchema = z.object({
  recipients: z.array(recipientItemSchema).min(1).max(2000),
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
    const json = await req.json();
    const parsed = addRecipientsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let addedCount = 0;
    for (const r of parsed.data.recipients) {
      try {
        await prisma.campaignRecipient.upsert({
          where: {
            campaignId_email: {
              campaignId: id,
              email: r.email.toLowerCase(),
            },
          },
          update: {
            name: r.name,
            company: r.company,
          },
          create: {
            campaignId: id,
            email: r.email.toLowerCase(),
            name: r.name,
            company: r.company,
            status: 'PENDING',
          },
        });
        addedCount++;
      } catch {
        // Skip duplicate or invalid
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${addedCount} recipients`,
      addedCount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add recipients' }, { status: 500 });
  }
}
