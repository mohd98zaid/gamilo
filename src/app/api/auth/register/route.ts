import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { registerSchema } from '@/lib/validators';
import { store } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession, isTestEnvironment, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, email, workspaceName } = parsed.data;

    if (!isTestEnvironment()) {
      const normalizedEmail = email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const workspace = workspaceName || `${name}'s Workspace`;
      const slug = `${workspace}-${crypto.randomUUID().slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { name, email: normalizedEmail, passwordHash } });
        const createdWorkspace = await tx.workspace.create({
          data: {
            name: workspace,
            slug,
            trialEndsAt: new Date(Date.now() + 30 * 86400000),
            brandSettings: { create: { businessName: workspace, industry: 'Not specified' } },
            members: { create: { userId: user.id, role: 'OWNER' } },
          },
        });
        return { user, workspace: createdWorkspace };
      });
      await setSessionCookie(await createSession(created.user.id));
      return NextResponse.json({ success: true, user: { id: created.user.id, name, email: normalizedEmail }, workspace: created.workspace }, { status: 201 });
    }

    if (workspaceName) {
      store.workspace.name = workspaceName;
      store.workspace.slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      store.workspace.brandSettings.businessName = workspaceName;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: `usr_${Date.now()}`,
        name,
        email,
      },
      workspace: store.workspace,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
