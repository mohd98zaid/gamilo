import { NextResponse } from 'next/server';
import { getCurrentUser, isTestEnvironment } from './auth';

export const WORKSPACE_ROLES = ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasWorkspaceRole(role: string, minimumRole: WorkspaceRole): boolean {
  const normalizedRole = role.toUpperCase() as WorkspaceRole;
  return normalizedRole in ROLE_RANK && ROLE_RANK[normalizedRole] >= ROLE_RANK[minimumRole];
}

export async function requireApiAuth(minimumRole?: WorkspaceRole) {
  if (isTestEnvironment()) return null;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (minimumRole && !hasWorkspaceRole(user.role, minimumRole)) {
    return NextResponse.json({ error: 'Insufficient workspace permissions' }, { status: 403 });
  }
  return user;
}
