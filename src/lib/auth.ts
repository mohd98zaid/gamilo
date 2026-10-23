import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getRuntimeConfig } from './config';

export const SESSION_COOKIE = 'gmailo_session';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const config = getRuntimeConfig();
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.COOKIE_SECURE === 'true' || config.NODE_ENV === 'production',
    path: '/',
    maxAge: config.SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(userId: string): Promise<string> {
  const config = getRuntimeConfig();
  const rawToken = crypto.randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      userId,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + config.SESSION_TTL_DAYS * 86400000),
    },
  });
  return rawToken;
}

export async function setSessionCookie(rawToken: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, rawToken, cookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

export async function deleteCurrentSession(): Promise<void> {
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } });
  }
  await clearSessionCookie();
}

export async function getCurrentUser() {
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(rawToken) },
    include: {
      user: {
        include: {
          workspaces: { include: { workspace: { include: { brandSettings: true } } }, orderBy: { joinedAt: 'asc' }, take: 1 },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.deleteMany({ where: { id: session.id } });
    await clearSessionCookie();
    return null;
  }

  const membership = session.user.workspaces[0];
  const role = membership?.role.toUpperCase();
  if (!membership || !role || !['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'].includes(role)) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    await clearSessionCookie();
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
    workspaceId: membership.workspaceId,
    role,
    workspace: membership.workspace,
  };
}

export function isTestEnvironment(): boolean {
  // Test fixtures must be explicitly enabled. NODE_ENV alone is not a safe
  // authorization signal because route handlers use this helper to select the
  // in-memory fixture path.
  return process.env.NODE_ENV === 'test' && process.env.GMAILO_TEST_AUTH_BYPASS === 'true';
}
