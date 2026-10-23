import type { PostEntity } from '@/features/testing/store';

export type PostStatus = PostEntity['status'];
export type PostCreateStatus = 'DRAFT' | 'SCHEDULED';

export interface PostCreateInput {
  caption: string;
  channelIds: string[];
  mediaUrls: string[];
  scheduledAt?: string | null;
  status: PostCreateStatus;
}

export interface PostUpdateInput {
  caption?: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  status?: PostCreateStatus;
}

export interface PostQuery {
  workspaceId: string;
  status?: string | null;
}

export interface PostScope {
  workspaceId: string;
  id: string;
}

export interface PostRepository {
  list(query: PostQuery): Promise<unknown[]>;
  findById(scope: PostScope): Promise<unknown | null>;
  create(workspaceId: string, input: PostCreateInput): Promise<PostCreateResult>;
  update(scope: PostScope, input: PostUpdateInput): Promise<unknown | null>;
  delete(scope: PostScope): Promise<boolean>;
}

export type PostCreateResult =
  | { ok: true; post: unknown }
  | { ok: false; reason: 'INVALID_CHANNELS' };
