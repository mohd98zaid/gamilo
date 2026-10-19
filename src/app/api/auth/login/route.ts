import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators';
import { store } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      token: 'mock_jwt_token_demo_session',
      user: {
        id: 'usr_demo_1',
        email: parsed.data.email,
        name: 'Demo User',
      },
      workspace: store.workspace,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
