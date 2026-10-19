/**
 * NVIDIA NIM AI Client Integration
 * Uses OpenAI-compatible endpoints on NVIDIA NIM with primary & fallback models,
 * configured per user specifications.
 */

import { withRetry } from '../errors';

export interface GenerateTextOptions {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class NvidiaNimClient {
  private apiKey: string;
  private baseUrl: string;
  public primaryModel: string;
  public fallbackModel: string;
  public maxTokens: number;
  public temperature: number;

  constructor() {
    this.apiKey =
      process.env.NVIDIA_API_KEY ||
      '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';
    this.baseUrl = (
      process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
    ).replace(/\/$/, '');
    this.primaryModel = process.env.NVIDIA_PRIMARY_MODEL || 'openai/gpt-oss-20b';
    this.fallbackModel =
      process.env.NVIDIA_FALLBACK_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';
    this.maxTokens = parseInt(process.env.NVIDIA_MAX_OUTPUT_TOKENS || '2048', 10);
    this.temperature = parseFloat(process.env.NVIDIA_TEMPERATURE || '0.1');
  }

  private async callModelEndpoint(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA NIM API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    if (!choice) {
      throw new Error('NVIDIA NIM returned empty choices');
    }

    // Handle reasoning models like gpt-oss-20b
    let text = choice.message?.content;
    if (!text && choice.message?.reasoning_content) {
      text = choice.message.reasoning_content;
    }

    if (!text) {
      // If content was null due to token limit or reasoning format, check text property
      text = choice.text || '';
    }

    return (text || '').trim();
  }

  /**
   * Generates text with automatic retry and model fallback.
   */
  async generate(options: GenerateTextOptions): Promise<{
    text: string;
    modelUsed: string;
    durationMs: number;
  }> {
    const start = Date.now();
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.userPrompt });

    const maxTokens = options.maxTokens ?? this.maxTokens;
    const temperature = options.temperature ?? this.temperature;
    const requestedModel = options.model || this.primaryModel;

    // 1. Try primary model with retry
    try {
      const result = await withRetry(
        () => this.callModelEndpoint(requestedModel, messages, maxTokens, temperature),
        { maxRetries: 2, baseDelayMs: 400 }
      );
      return {
        text: result,
        modelUsed: requestedModel,
        durationMs: Date.now() - start,
      };
    } catch (primaryErr) {
      console.warn(`Primary model ${requestedModel} failed, trying fallback ${this.fallbackModel}:`, primaryErr);

      // 2. If fallback model is distinct, attempt fallback
      if (this.fallbackModel && this.fallbackModel !== requestedModel) {
        try {
          const fallbackResult = await withRetry(
            () => this.callModelEndpoint(this.fallbackModel, messages, maxTokens, temperature),
            { maxRetries: 1, baseDelayMs: 500 }
          );
          return {
            text: fallbackResult,
            modelUsed: this.fallbackModel,
            durationMs: Date.now() - start,
          };
        } catch (fallbackErr) {
          throw new Error(
            `All NVIDIA NIM models failed. Primary error: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}. Fallback error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
          );
        }
      }

      throw primaryErr;
    }
  }
}

export const nvidiaNim = new NvidiaNimClient();
