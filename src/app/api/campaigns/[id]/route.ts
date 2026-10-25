import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCampaignSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  subject: z.string().trim().min(2).max(250).optional(),
  body: z.string().trim().min(5).optional(),
  fromChannelId: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED']).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('VIEWER');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  const campaign = await prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      recipients: { orderBy: { email: 'asc' } },
      steps: { orderBy: { stepNumber: 'asc' } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    const json = await req.json();
    const parsed = updateCampaignSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  await prisma.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Campaign deleted' });
}
