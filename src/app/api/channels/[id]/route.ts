import { NextResponse } from 'next/server';
import { store } from '@/features/testing/store';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await params;
  const auth = await requireApiAuth('ADMIN');
  if (auth instanceof NextResponse) return auth;
  if (auth) {
    const result = await prisma.channel.updateMany({ where: { id, workspaceId: auth.workspaceId }, data: { isActive: false } });
    if (result.count === 0) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Channel disconnected' });
  }
  const index = store.channels.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  const removed = store.channels.splice(index, 1)[0];
  return NextResponse.json({
    success: true,
    message: `Disconnected ${removed.name}`,
  });
}
