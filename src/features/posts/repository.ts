import { prisma } from '@/lib/prisma';
import { store, type PostEntity } from '@/features/testing/store';
import { mapPrismaPost } from './mappers';
import type {
  PostCreateInput,
  PostCreateResult,
  PostQuery,
  PostRepository,
  PostScope,
  PostUpdateInput,
} from './types';

function computedStatus(input: Pick<PostCreateInput, 'scheduledAt' | 'status'>): PostEntity['status'] {
  return input.scheduledAt || input.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT';
}

function postUpdateData(input: PostUpdateInput) {
  return {
    ...(input.caption !== undefined ? { caption: input.caption } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
    ...(input.mediaUrls !== undefined ? { mediaUrls: JSON.stringify(input.mediaUrls) } : {}),
  };
}

export function createPrismaPostRepository(): PostRepository {
  return {
    async list({ workspaceId, status }: PostQuery) {
      const posts = await prisma.post.findMany({
        where: { workspaceId, ...(status ? { status: status.toUpperCase() } : {}) },
        include: { channels: true, metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      });
      return posts.map((post) => mapPrismaPost(post));
    },

    async findById({ workspaceId, id }: PostScope) {
      const post = await prisma.post.findFirst({
        where: { id, workspaceId },
        include: { channels: true, metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });
      return post ? mapPrismaPost(post) : null;
    },

    async create(workspaceId: string, input: PostCreateInput): Promise<PostCreateResult> {
      const ownedChannels = await prisma.channel.findMany({
        where: { id: { in: input.channelIds }, workspaceId, isActive: true },
        select: { id: true },
      });
      if (ownedChannels.length !== input.channelIds.length) {
        return { ok: false, reason: 'INVALID_CHANNELS' };
      }

      const post = await prisma.post.create({
        data: {
          workspaceId,
          caption: input.caption,
          mediaUrls: JSON.stringify(input.mediaUrls),
          status: computedStatus(input),
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          channels: { create: input.channelIds.map((channelId) => ({ channelId })) },
        },
        include: { channels: true },
      });
      return { ok: true, post: mapPrismaPost(post) };
    },

    async update({ workspaceId, id }: PostScope, input: PostUpdateInput) {
      const updated = await prisma.post.updateMany({
        where: { id, workspaceId },
        data: postUpdateData(input),
      });
      if (updated.count === 0) return null;
      return this.findById({ workspaceId, id });
    },

    async delete({ workspaceId, id }: PostScope) {
      const deleted = await prisma.post.deleteMany({ where: { id, workspaceId } });
      return deleted.count > 0;
    },
  };
}

export function createInMemoryPostRepository(): PostRepository {
  return {
    async list({ workspaceId, status }: PostQuery) {
      return store.posts.filter((post) => {
        const workspaceMatches = post.workspaceId === workspaceId;
        const statusMatches = !status || post.status.toUpperCase() === status.toUpperCase();
        return workspaceMatches && statusMatches;
      });
    },

    async findById({ workspaceId, id }: PostScope) {
      return store.posts.find((post) => post.id === id && post.workspaceId === workspaceId) ?? null;
    },

    async create(workspaceId: string, input: PostCreateInput): Promise<PostCreateResult> {
      const ownedChannelIds = new Set(
        store.channels.filter((channel) => channel.workspaceId === workspaceId && channel.isActive).map((channel) => channel.id),
      );
      if (input.channelIds.some((channelId) => !ownedChannelIds.has(channelId))) {
        return { ok: false, reason: 'INVALID_CHANNELS' };
      }

      const post: PostEntity = {
        id: `post_${Date.now()}`,
        workspaceId,
        caption: input.caption,
        channelIds: input.channelIds,
        mediaUrls: input.mediaUrls,
        status: computedStatus(input),
        scheduledAt: input.scheduledAt || undefined,
        createdAt: new Date().toISOString(),
      };
      store.posts.unshift(post);
      return { ok: true, post };
    },

    async update({ workspaceId, id }: PostScope, input: PostUpdateInput) {
      const post = store.posts.find((candidate) => candidate.id === id && candidate.workspaceId === workspaceId);
      if (!post) return null;
      Object.assign(post, input);
      return post;
    },

    async delete({ workspaceId, id }: PostScope) {
      const index = store.posts.findIndex((post) => post.id === id && post.workspaceId === workspaceId);
      if (index === -1) return false;
      store.posts.splice(index, 1);
      return true;
    },
  };
}
