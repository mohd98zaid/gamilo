import { NextResponse } from 'next/server';
import { generateApiKey } from '@/lib/api-keys';
import { createApiKeySchema } from '@/features/api-keys/schemas';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

interface StoredApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: string;
  isActive: boolean;
}

// Test-only compatibility store. Production reads and writes Prisma records.
const apiKeysStore: StoredApiKey[] = [];

export async function GET() {
  const auth = await requireApiAuth('ADMIN');
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const keys = await prisma.apiKey.findMany({ where: { workspaceId: auth.workspaceId, isActive: true }, select: { id: true, name: true, keyPrefix: true, createdAt: true, isActive: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ keys });
  }
  return NextResponse.json({
    keys: apiKeysStore.map(({ id, name, keyPrefix, createdAt, isActive }) => ({
      id,
      name,
      keyPrefix,
      createdAt,
      isActive,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth('ADMIN');
    if (auth instanceof NextResponse) return auth;
    const parsed = createApiKeySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const generated = generateApiKey();

    if (auth) {
      const key = await prisma.apiKey.create({ data: { userId: auth.id, workspaceId: auth.workspaceId, name: parsed.data.name, keyHash: generated.keyHash, keyPrefix: generated.keyPrefix, scopes: parsed.data.scopes.join(',') } });
      return NextResponse.json({ success: true, key: generated.key, keyPrefix: generated.keyPrefix, id: key.id }, { status: 201 });
    }

    const newKeyRecord: StoredApiKey = {
      id: `key_${Date.now()}`,
      name: parsed.data.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    apiKeysStore.unshift(newKeyRecord);

    return NextResponse.json(
      {
        success: true,
        key: generated.key, // Only returned once!
        keyPrefix: generated.keyPrefix,
        id: newKeyRecord.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiAuth('ADMIN');
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Key id is required' }, { status: 400 });
  }

  if (auth) {
    const revoked = await prisma.apiKey.updateMany({ where: { id, workspaceId: auth.workspaceId, isActive: true }, data: { isActive: false } });
    if (revoked.count === 0) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'API key revoked' });
  }

  const index = apiKeysStore.findIndex((k) => k.id === id);
  if (index !== -1) {
    apiKeysStore.splice(index, 1);
  }

  return NextResponse.json({ success: true, message: 'API key revoked' });
}
