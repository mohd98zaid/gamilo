import { NextResponse } from 'next/server';
import { generateApiKey } from '@/lib/api-keys';

interface StoredApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: string;
  isActive: boolean;
}

// In-memory key store
const apiKeysStore: StoredApiKey[] = [
  {
    id: 'key_default_1',
    name: 'Production Primary Key',
    keyPrefix: 'gml_live_9f82a1b',
    keyHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    isActive: true,
  },
];

export async function GET() {
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
    const { name } = await req.json();
    const generated = generateApiKey();

    const newKeyRecord: StoredApiKey = {
      id: `key_${Date.now()}`,
      name: name || 'API Key',
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Key id is required' }, { status: 400 });
  }

  const index = apiKeysStore.findIndex((k) => k.id === id);
  if (index !== -1) {
    apiKeysStore.splice(index, 1);
  }

  return NextResponse.json({ success: true, message: 'API key revoked' });
}
