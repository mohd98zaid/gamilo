import { NextResponse } from 'next/server';
import { store } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const index = store.channels.findIndex((c) => c.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  const removed = store.channels.splice(index, 1)[0];
  return NextResponse.json({
    success: true,
    message: `Disconnected ${removed.name}`,
  });
}
