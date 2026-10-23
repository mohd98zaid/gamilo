import { z } from 'zod';

export const boundedText = (max: number) => z.string().trim().min(1).max(max);
