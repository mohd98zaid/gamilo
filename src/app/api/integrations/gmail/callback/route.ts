import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireApiAuth } from '@/lib/api-auth';
import { getRuntimeConfig } from '@/lib/config';
import { encryptToString } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireApiAuth('ADMIN');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = (await cookies()).get('gmailo_gmail_oauth_state')?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'Invalid or expired Gmail OAuth state' }, { status: 400 });
  }

  const config = getRuntimeConfig();
  const clientId = config.GOOGLE_CLIENT_ID;
  const clientSecret = config.GOOGLE_CLIENT_SECRET;
  const redirectUri = config.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri || clientId === 'replace_me') {
    return NextResponse.redirect(new URL('/dashboard/channels?error=google_oauth_not_configured', req.url));
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) return NextResponse.json({ error: 'Gmail authorization failed' }, { status: 502 });
  const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokens.access_token) return NextResponse.json({ error: 'Gmail did not return an access token' }, { status: 502 });

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) return NextResponse.json({ error: 'Unable to read the authorized Gmail profile' }, { status: 502 });
  const profile = await profileResponse.json() as { email?: string; name?: string; picture?: string };
  if (!profile.email) return NextResponse.json({ error: 'Gmail profile did not include an email address' }, { status: 502 });

  await prisma.channel.create({
    data: {
      workspaceId: auth.workspaceId,
      platform: 'GMAIL',
      platformId: profile.email,
      name: profile.name ? `${profile.name} (${profile.email})` : profile.email,
      accessToken: encryptToString(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToString(tokens.refresh_token) : undefined,
      tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      avatarUrl: profile.picture,
    },
  });

  (await cookies()).set('gmailo_gmail_oauth_state', '', { httpOnly: true, maxAge: 0, path: '/' });
  return NextResponse.redirect(new URL('/dashboard/channels?connected=gmail', req.url));
}
