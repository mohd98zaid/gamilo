import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(2).max(250),
  body: z.string().trim().min(5),
  fromChannelId: z.string().optional(),
});

export async function GET() {
  const auth = await requireApiAuth('VIEWER');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      recipients: true,
      steps: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    body: c.body,
    status: c.status,
    totalRecipients: c.recipients.length,
    totalSent: c.totalSent,
    totalFailed: c.totalFailed,
    fromChannelId: c.fromChannelId,
    createdAt: c.createdAt,
    startedAt: c.startedAt,
    completedAt: c.completedAt,
  }));

  return NextResponse.json({ campaigns: formatted, total: formatted.length });
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('EDITOR');
    if (auth instanceof NextResponse) return auth;

    const workspaceId = auth?.workspaceId ?? 'default-workspace';
    const json = await req.json();
    const parsed = createCampaignSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, subject, body, fromChannelId } = parsed.data;

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name,
        subject,
        body,
        fromChannelId,
        type: 'EMAIL',
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    console.error('Failed to create campaign', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
