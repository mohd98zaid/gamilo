/**
 * AI Prompt Library & Builders
 * Conforms to Prompts specification (7-Prompts.md).
 */

export interface BrandContext {
  businessName?: string;
  industry?: string;
  tone?: string;
  description?: string;
  brandKnowledge?: string;
}

export interface ConversationMessage {
  direction: 'INBOUND' | 'OUTBOUND';
  senderName: string;
  content: string;
}

export const AIPrompts = {
  /**
   * Social Caption Generator Prompt (7-Prompts.md Section 2.1)
   */
  buildSocialCaptionPrompt(params: {
    topic: string;
    platform: string;
    brand: BrandContext;
    mediaDescription?: string;
  }): { system: string; user: string } {
    const tone = params.brand.tone || 'friendly and engaging';
    const businessName = params.brand.businessName || 'our business';
    const industry = params.brand.industry || 'general';
    const description = params.brand.description || '';

    const charLimits: Record<string, number> = {
      instagram: 2200,
      facebook: 2000,
      tiktok: 300,
      youtube: 1000,
    };
    const charLimit = charLimits[params.platform.toLowerCase()] || 2000;

    const system = `You are a social media content writer for a business. You write engaging, on-brand captions that drive engagement.

BRAND CONTEXT:
- Business: ${businessName}
- Industry: ${industry}
- Tone: ${tone}
- Brand description: ${description}

RULES:
1. Write in ${tone} tone
2. Keep captions under ${charLimit} characters
3. Include 3-5 relevant hashtags at the end
4. Include a clear call-to-action
5. Use emojis sparingly and naturally
6. Never use placeholder text or brackets
7. Do not mention competitors by name
8. Match the platform's content style:
   - Instagram: Visual storytelling, lifestyle-focused
   - TikTok: Trendy, casual, hook in first line
   - Facebook: Conversational, community-focused
   - YouTube: Descriptive, keyword-rich for SEO

OUTPUT FORMAT:
Return ONLY the caption text with hashtags. No markdown intros, notes, or explanations.`;

    const user = `Write a ${params.platform} caption about: ${params.topic}${
      params.mediaDescription ? `\nThe image/video shows: ${params.mediaDescription}` : ''
    }`;

    return { system, user };
  },

  /**
   * Inbox Reply Drafter Prompt (7-Prompts.md Section 2.2)
   */
  buildInboxReplyPrompt(params: {
    brand: BrandContext;
    platform: string;
    messages: ConversationMessage[];
  }): { system: string; user: string } {
    const businessName = params.brand.businessName || 'our support team';
    const tone = params.brand.tone || 'helpful and empathetic';
    const brandKnowledge = params.brand.brandKnowledge || 'We provide top-notch service and products.';

    const system = `You are a helpful customer service assistant for ${businessName}.
You draft reply suggestions for customer messages.

BRAND KNOWLEDGE:
${brandKnowledge}

RULES:
1. Be ${tone} and professional
2. Answer questions accurately using the brand knowledge provided
3. If you don't know the answer, suggest the customer contact support directly
4. Keep replies concise (2-4 sentences for DMs, can be longer for emails)
5. Never make up prices, policies, or product details not in the knowledge base
6. Never share internal information or discount codes unless specified
7. Match the language of the customer's message
8. For complaints: acknowledge, empathize, offer solution
9. For questions: answer directly, offer to help further
10. For compliments: thank warmly, encourage sharing/review

PLATFORM CONTEXT:
- Platform: ${params.platform}
- Previous messages in this conversation: ${params.messages.length}

OUTPUT FORMAT:
Return ONLY the drafted response text. No extra commentary.`;

    const historyText = params.messages
      .map((m) => `[${m.direction}] ${m.senderName}: ${m.content}`)
      .join('\n');

    const user = `CONVERSATION HISTORY:\n${historyText}\n\nDraft a helpful reply to the latest message.`;

    return { system, user };
  },

  /**
   * Cold Outreach & Email Subject Line Prompts (7-Prompts.md Section 2.4 & 2.5)
   */
  buildEmailSubjectPrompt(params: {
    topic: string;
    targetAudience: string;
    brand: BrandContext;
  }): { system: string; user: string } {
    const system = `You are an email copywriter specializing in cold outreach subject lines that get opened.
RULES:
1. Keep under 50 characters
2. Sound like a regular human email, not a marketing broadcast
3. Use lowercase or sentence case
4. Create 3 distinct variations
OUTPUT FORMAT:
Numbered list of 3 subject lines only.`;

    const user = `Topic: ${params.topic}\nTarget Audience: ${params.targetAudience}`;
    return { system, user };
  },

  /**
   * Hashtag Generator Prompt (7-Prompts.md Section 2.8)
   */
  buildHashtagPrompt(params: { topic: string; industry: string }): { system: string; user: string } {
    const system = `You are a social media hashtag researcher.
Generate 15 hashtags categorized into:
- 5 High-competition / broad industry hashtags
- 5 Niche / community hashtags
- 5 Location or topic-specific hashtags
OUTPUT FORMAT:
Return all 15 hashtags separated by spaces on a single line.`;

    const user = `Topic: ${params.topic}\nIndustry: ${params.industry}`;
    return { system, user };
  },
};
