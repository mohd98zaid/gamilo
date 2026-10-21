import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { encryptToString } from '@/lib/encryption';
import { channelSchema } from '@/lib/validators';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

function publicChannel(channel: Record<string, unknown>) {
  const { accessToken: _accessToken, refreshToken: _refreshToken, ...safeChannel } = channel;
  return safeChannel;
}

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const channels = await prisma.channel.findMany({ where: { workspaceId: auth.workspaceId, isActive: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ channels: channels.map((channel) => publicChannel(channel as unknown as Record<string, unknown>)), total: channels.length });
  }
  return NextResponse.json({
    channels: store.channels.map((channel) => publicChannel(channel as unknown as Record<string, unknown>)),
    total: store.channels.length,
  });
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth();
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();
    const parsed = channelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const {
      platform,
      name,
      platformId,
      accessToken,
      email,
      smtpHost,
      smtpPort,
      imapHost,
      imapPort,
      authType,
    } = parsed.data;

    const channelName = name || email;
    if (!channelName) {
      return NextResponse.json(
        { error: 'Platform and channel name / email are required' },
        { status: 400 }
      );
    }

    const storedAccessToken = accessToken || (process.env.NODE_ENV === 'test' ? 'test-only-token' : undefined);
    if (!storedAccessToken) {
      return NextResponse.json(
        { error: 'A provider credential is required. Use the provider OAuth flow or a supported app password.' },
        { status: 400 },
      );
    }

    const isEmailProvider = platform === 'GMAIL' || platform === 'EMAIL';

    const newChannel = {
      id: `ch_${Date.now()}`,
      workspaceId: store.workspace.id,
      platform,
      platformId: platformId || email || `pid_${Date.now()}`,
      name: channelName,
      accessToken: encryptToString(storedAccessToken),
      avatarUrl: isEmailProvider
        ? platform === 'GMAIL'
          ? 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=100'
          : 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100'
        : parsed.data.avatarUrl || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100',
      isActive: true,
      connectedAt: new Date().toISOString(),
      emailConfig: isEmailProvider
        ? {
            email: email || channelName,
            authType: authType || 'APP_PASSWORD',
            smtpHost: smtpHost || (platform === 'GMAIL' ? 'smtp.gmail.com' : 'smtp.office365.com'),
            smtpPort: smtpPort || 587,
            imapHost: imapHost || (platform === 'GMAIL' ? 'imap.gmail.com' : 'outlook.office365.com'),
            imapPort: imapPort || 993,
          }
        : undefined,
    };

    if (auth) {
      const created = await prisma.channel.create({
        data: {
          workspaceId: auth.workspaceId,
          platform,
          platformId: newChannel.platformId,
          name: newChannel.name,
          accessToken: newChannel.accessToken,
          avatarUrl: newChannel.avatarUrl,
          isActive: true,
        },
      });
      return NextResponse.json({ success: true, channel: publicChannel(created as unknown as Record<string, unknown>) }, { status: 201 });
    }

    store.channels.push(newChannel as any);

    return NextResponse.json({ success: true, channel: publicChannel(newChannel) }, { status: 201 });
  } catch (error) {
    console.error('Channel connection failed', { error: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json(
      { error: 'Failed to connect channel' },
      { status: 500 }
    );
  }
}
