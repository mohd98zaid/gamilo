import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { sendBulkEmails } from '@/lib/email/sender';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('EDITOR');
  if (auth instanceof NextResponse) return auth;

  const workspaceId = auth?.workspaceId ?? 'default-workspace';

  try {
    let recipientId: string | undefined;
    try {
      const body = await req.json();
      recipientId = body?.recipientId;
    } catch {
      // empty body, full campaign dispatch
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        recipients: recipientId
          ? { where: { id: recipientId } }
          : { where: { status: 'PENDING' } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!campaign.subject || !campaign.body) {
      return NextResponse.json(
        { error: 'Campaign subject and body must be set before sending' },
        { status: 400 }
      );
    }

    if (campaign.recipients.length === 0) {
      return NextResponse.json(
        { error: recipientId ? 'Recipient not found in this campaign' : 'No pending recipients found in this campaign' },
        { status: 400 }
      );
    }

    const wasFailed = recipientId ? campaign.recipients[0]?.status === 'FAILED' : false;

    // Mark as SENDING for full campaign run
    if (!recipientId) {
      await prisma.campaign.update({
        where: { id },
        data: {
          status: 'SENDING',
          startedAt: new Date(),
        },
      });
    }

    const dispatchResult = await sendBulkEmails({
      workspaceId,
      channelId: campaign.fromChannelId ?? undefined,
      subject: campaign.subject,
      bodyTemplate: campaign.body,
      recipients: campaign.recipients.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        company: r.company,
      })),
      delayBetweenEmailsMs: 500, // anti-spam interval
    });

    // Update recipient statuses in DB
    for (const res of dispatchResult.results) {
      await prisma.campaignRecipient.updateMany({
        where: { campaignId: id, email: res.email },
        data: {
          status: res.success ? 'SENT' : 'FAILED',
          sentAt: res.success ? new Date() : null,
          errorMessage: res.error ?? null,
        },
      });
    }

    // Update campaign counters
    const updateData: any = {};
    if (recipientId) {
      if (dispatchResult.sent > 0) {
        updateData.totalSent = { increment: 1 };
        if (wasFailed && campaign.totalFailed > 0) {
          updateData.totalFailed = { decrement: 1 };
        }
      } else if (dispatchResult.failed > 0 && !wasFailed) {
        updateData.totalFailed = { increment: 1 };
      }
    } else {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
      updateData.totalSent = { increment: dispatchResult.sent };
      updateData.totalFailed = { increment: dispatchResult.failed };
    }

    const updated = Object.keys(updateData).length > 0
      ? await prisma.campaign.update({
          where: { id },
          data: updateData,
        })
      : campaign;

    return NextResponse.json({
      success: true,
      sent: dispatchResult.sent,
      failed: dispatchResult.failed,
      total: dispatchResult.total,
      campaign: updated,
      result: dispatchResult.results[0],
    });
  } catch (error) {
    console.error('Campaign sending failed', error);
    await prisma.campaign.updateMany({
      where: { id, workspaceId },
      data: { status: 'PAUSED' },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Campaign dispatch failed' },
      { status: 500 }
    );
  }
}
