import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  cookies: {
    get: vi.fn(),
    set: vi.fn(),
  },
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => mocks.cookies) }));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/config', () => ({
  getRuntimeConfig: vi.fn(() => ({
    NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'test',
    SESSION_TTL_DAYS: 30,
    COOKIE_SECURE: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  })),
}));

import { createSession, deleteCurrentSession, getCurrentUser, isTestEnvironment, SESSION_COOKIE } from '@/lib/auth';
import { hasWorkspaceRole, requireApiAuth } from '@/lib/api-auth';

describe('authentication and session hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBypass = process.env.GMAILO_TEST_AUTH_BYPASS;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, { NODE_ENV: 'test' });
    process.env.GMAILO_TEST_AUTH_BYPASS = 'true';
    mocks.cookies.get.mockReturnValue(undefined);
    mocks.prisma.session.create.mockResolvedValue({ id: 'session-1' });
    mocks.prisma.session.deleteMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv });
    if (originalBypass === undefined) delete process.env.GMAILO_TEST_AUTH_BYPASS;
    else process.env.GMAILO_TEST_AUTH_BYPASS = originalBypass;
  });

  it('requires an explicit fixture flag and never treats production as a test environment', () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.GMAILO_TEST_AUTH_BYPASS = 'true';
    expect(isTestEnvironment()).toBe(false);

    Object.assign(process.env, { NODE_ENV: 'test' });
    process.env.GMAILO_TEST_AUTH_BYPASS = 'false';
    expect(isTestEnvironment()).toBe(false);
    process.env.GMAILO_TEST_AUTH_BYPASS = 'true';
    expect(isTestEnvironment()).toBe(true);
  });

  it('returns 401 in production when no valid session is present', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    process.env.GMAILO_TEST_AUTH_BYPASS = 'true';

    const result = await requireApiAuth();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('stores only a hash of a random session token with a finite expiry', async () => {
    const token = await createSession('user-1');
    const createCall = mocks.prisma.session.create.mock.calls[0]?.[0];

    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.token).not.toBe(token);
    expect(createCall.data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(createCall.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('deletes an expired session and clears its cookie', async () => {
    mocks.cookies.get.mockReturnValue({ value: 'expired-raw-token' });
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: 'expired-session',
      expiresAt: new Date(Date.now() - 1),
      user: { id: 'user-1', email: 'user@example.test', name: 'User', avatarUrl: null, workspaces: [] },
    });

    expect(await getCurrentUser()).toBeNull();
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'expired-session' } });
    expect(mocks.cookies.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      '',
      expect.objectContaining({ maxAge: 0, httpOnly: true }),
    );
  });

  it('invalidates sessions whose workspace membership was removed', async () => {
    mocks.cookies.get.mockReturnValue({ value: 'orphaned-raw-token' });
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: 'orphaned-session',
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user-1', email: 'user@example.test', name: 'User', avatarUrl: null, workspaces: [] },
    });

    expect(await getCurrentUser()).toBeNull();
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'orphaned-session' } });
    expect(mocks.cookies.set).toHaveBeenCalledWith(SESSION_COOKIE, '', expect.any(Object));
  });

  it('invalidates sessions with an unrecognized workspace role', async () => {
    mocks.cookies.get.mockReturnValue({ value: 'bad-role-token' });
    mocks.prisma.session.findUnique.mockResolvedValue({
      id: 'bad-role-session',
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        email: 'user@example.test',
        name: 'User',
        avatarUrl: null,
        workspaces: [{ workspaceId: 'workspace-1', role: 'SUPERUSER', workspace: { id: 'workspace-1' } }],
      },
    });

    expect(await getCurrentUser()).toBeNull();
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'bad-role-session' } });
  });

  it('revokes the current persisted session on logout', async () => {
    mocks.cookies.get.mockReturnValue({ value: 'raw-token' });

    await deleteCurrentSession();

    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { token: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
    expect(mocks.cookies.set).toHaveBeenCalledWith(SESSION_COOKIE, '', expect.objectContaining({ maxAge: 0 }));
  });

  it('enforces the workspace role hierarchy', () => {
    expect(hasWorkspaceRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasWorkspaceRole('ADMIN', 'EDITOR')).toBe(true);
    expect(hasWorkspaceRole('EDITOR', 'ADMIN')).toBe(false);
    expect(hasWorkspaceRole('VIEWER', 'EDITOR')).toBe(false);
    expect(hasWorkspaceRole('unknown', 'VIEWER')).toBe(false);
  });
});
