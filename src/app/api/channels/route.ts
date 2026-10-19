import { NextResponse } from 'next/server';
import { store } from '@/lib/db';
import { encryptToString } from '@/lib/encryption';

export async function GET() {
  return NextResponse.json({
    channels: store.channels,
    total: store.channels.length,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    } = body;

    const channelName = name || email;
    if (!platform || !channelName) {
      return NextResponse.json(
        { error: 'Platform and channel name / email are required' },
        { status: 400 }
      );
    }

    const isEmailProvider = platform.toUpperCase() === 'GMAIL' || platform.toUpperCase() === 'EMAIL';

    const newChannel = {
      id: `ch_${Date.now()}`,
      workspaceId: store.workspace.id,
      platform: platform.toUpperCase(),
      platformId: platformId || email || `pid_${Date.now()}`,
      name: channelName,
      accessToken: encryptToString(accessToken || 'secret_token_123'),
      avatarUrl: isEmailProvider
        ? platform.toUpperCase() === 'GMAIL'
          ? 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=100'
          : 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100'
        : body.avatarUrl || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100',
      isActive: true,
      connectedAt: new Date().toISOString(),
      emailConfig: isEmailProvider
        ? {
            email: email || channelName,
            authType: authType || 'APP_PASSWORD',
            smtpHost: smtpHost || (platform.toUpperCase() === 'GMAIL' ? 'smtp.gmail.com' : 'smtp.office365.com'),
            smtpPort: smtpPort || 587,
            imapHost: imapHost || (platform.toUpperCase() === 'GMAIL' ? 'imap.gmail.com' : 'outlook.office365.com'),
            imapPort: imapPort || 993,
          }
        : undefined,
    };

    store.channels.push(newChannel as any);

    return NextResponse.json({ success: true, channel: newChannel }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect channel' },
      { status: 500 }
    );
  }
}
