import { z } from 'zod';

const boundedText = (max: number) => z.string().trim().min(1).max(max);

const createPostFields = z.object({
  caption: boundedText(2200).min(1, 'Caption cannot be empty'),
  channelIds: z.array(z.string().trim().min(1).max(100)).min(1, 'Select at least one channel').max(20),
  mediaUrls: z.array(z.string().url()).max(20).optional().default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED']).default('DRAFT'),
}).strict();

export const createPostSchema = createPostFields.superRefine((value, ctx) => {
  if (value.status === 'SCHEDULED' && !value.scheduledAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledAt'],
      message: 'Scheduled posts require scheduledAt',
    });
  }
});

export const updatePostSchema = createPostFields.partial().strict().superRefine((value, ctx) => {
  if (value.status === 'SCHEDULED' && !value.scheduledAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledAt'],
      message: 'Scheduled posts require scheduledAt',
    });
  }
});
