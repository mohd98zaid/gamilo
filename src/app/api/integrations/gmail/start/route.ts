import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { getRuntimeConfig } from '@/lib/config';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireApiAuth('ADMIN');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const config = getRuntimeConfig();
  const clientId = config.GOOGLE_CLIENT_ID;
  const redirectUri = config.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri || clientId === 'replace_me' || clientId.trim() === '') {
    const isJson = req.headers.get('accept')?.includes('application/json');
    if (isJson) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI in environment.' },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL('/dashboard/channels?error=google_oauth_not_configured', req.url));
  }

  const state = crypto.randomBytes(24).toString('base64url');

  (await cookies()).set('gmailo_gmail_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production' || config.COOKIE_SECURE === 'true',
    maxAge: 10 * 60,
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'openid email https://www.googleapis.com/auth/gmail.modify',
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
