import { isTestEnvironment } from '@/lib/auth';
import { createInMemoryPostRepository, createPrismaPostRepository } from './repository';

export * from './mappers';
export * from './repository';
export * from './schemas';
export * from './types';

export function getPostRepository() {
  return isTestEnvironment() ? createInMemoryPostRepository() : createPrismaPostRepository();
}
