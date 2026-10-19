import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators';
import { store } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, email, workspaceName } = parsed.data;

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
