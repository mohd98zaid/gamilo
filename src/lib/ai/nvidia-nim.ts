/**
 * NVIDIA NIM AI Client Integration
 * Uses OpenAI-compatible endpoints on NVIDIA NIM with primary & fallback models,
 * configured per user specifications.
 */

import { withRetry } from '../errors';
import { getRuntimeConfig, requireConfigured } from '../config';

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
    const config = getRuntimeConfig(false);
    this.apiKey = config.NVIDIA_API_KEY || '';
    this.baseUrl = config.NVIDIA_BASE_URL.replace(/\/$/, '');
    this.primaryModel = config.NVIDIA_PRIMARY_MODEL;
    this.fallbackModel = config.NVIDIA_FALLBACK_MODEL || '';
    this.maxTokens = config.NVIDIA_MAX_OUTPUT_TOKENS;
    this.temperature = config.NVIDIA_TEMPERATURE;
  }

  private async callModelEndpoint(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const apiKey = requireConfigured(this.apiKey, 'NVIDIA_API_KEY');
    const url = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`NVIDIA NIM API request failed with status ${response.status}`);
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

    const result = (text || '').trim();
    if (!result) throw new Error('NVIDIA NIM returned an empty response');
    return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('NVIDIA NIM request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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
      console.warn(`Primary model ${requestedModel} failed; fallback configured: ${Boolean(this.fallbackModel)}`);

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
          throw new Error('All configured NVIDIA NIM models failed');
        }
      }

      throw primaryErr;
    }
  }
}

export const nvidiaNim = new NvidiaNimClient();
