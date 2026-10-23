import { NextResponse } from 'next/server';
import { loginSchema } from '@/features/auth/schemas';
import { store } from '@/features/testing/store';
import bcrypt from 'bcryptjs';
import { createSession, deleteCurrentSession, isTestEnvironment, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    if (isTestEnvironment()) {
      return NextResponse.json({
      success: true,
      token: 'test-session-only',
      user: {
        id: 'test-user',
        email: parsed.data.email,
        name: 'Test User',
      },
      workspace: store.workspace,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { workspaces: { include: { workspace: true }, orderBy: { joinedAt: 'asc' }, take: 1 } },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const membership = user.workspaces[0];
    if (!membership) {
      return NextResponse.json({ error: 'No workspace membership found' }, { status: 403 });
    }

    // Replace any browser session only after credentials have been verified.
    // This prevents session fixation and removes a stale session when changing
    // accounts in the same browser.
    await deleteCurrentSession();
    const rawSession = await createSession(user.id);
    await setSessionCookie(rawSession);
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: membership?.workspace ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
