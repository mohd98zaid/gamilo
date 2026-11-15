import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

function getSafeFilename(name: string): string {
  const safeName = name
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${safeName || 'campaign'}-email-ids.json`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await params;
  const auth = await requireApiAuth('VIEWER');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      select: { email: true },
      orderBy: { email: 'asc' },
    });

    return NextResponse.json(
      {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        emailIds: recipients.map((recipient) => recipient.email),
        total: recipients.length,
        exportedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="${getSafeFilename(campaign.name)}"`,
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to export campaign email IDs' }, { status: 500 });
  }
}
