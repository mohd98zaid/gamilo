import { NextResponse } from 'next/server';
import { getCurrentUser, isTestEnvironment } from './auth';

export async function requireApiAuth() {
  if (isTestEnvironment()) return null;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return user;
}
