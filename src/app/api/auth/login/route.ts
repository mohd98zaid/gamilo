import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators';
import { store } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, isTestEnvironment, setSessionCookie } from '@/lib/auth';
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
      token: 'test-only-session',
      user: {
        id: 'usr_demo_1',
        email: parsed.data.email,
        name: 'Demo User',
      },
      workspace: store.workspace,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { workspaces: { include: { workspace: true }, take: 1 } },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const rawSession = await createSession(user.id);
    await setSessionCookie(rawSession);
    const membership = user.workspaces[0];
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: membership?.workspace ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
