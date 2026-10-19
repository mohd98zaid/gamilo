import { describe, it, expect } from 'vitest';
import { AIPrompts } from '@/lib/ai/prompts';

describe('AI Prompt Engineering Templates (7-Prompts.md)', () => {
  it('constructs social caption prompt with brand context and platform constraints', () => {
    const { system, user } = AIPrompts.buildSocialCaptionPrompt({
      topic: 'Cold brew tonic launch',
      platform: 'instagram',
      brand: {
        businessName: 'Brew Haven Coffee',
        industry: 'Specialty Coffee',
        tone: 'playful and warm',
        description: 'Neighborhood roastery in Seattle',
      },
    });

    expect(system).toContain('Brew Haven Coffee');
    expect(system).toContain('Specialty Coffee');
    expect(system).toContain('playful and warm');
    expect(system).toContain('2200'); // Instagram character limit
    expect(user).toContain('Cold brew tonic launch');
  });

  it('constructs inbox reply prompt preserving multi-turn message history', () => {
    const { system, user } = AIPrompts.buildInboxReplyPrompt({
      brand: {
        businessName: 'Brew Haven Coffee',
        brandKnowledge: 'We do not charge extra for oat milk.',
      },
      platform: 'INSTAGRAM',
      messages: [
        {
          direction: 'INBOUND',
          senderName: 'sarah_adventures',
          content: 'Is there an upcharge for oat milk?',
        },
      ],
    });

    expect(system).toContain('We do not charge extra for oat milk.');
    expect(user).toContain('[INBOUND] sarah_adventures: Is there an upcharge for oat milk?');
    expect(user).toContain('Draft a helpful reply');
  });
});
