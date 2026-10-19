import { describe, it, expect } from 'vitest';
import { NvidiaNimClient } from '@/lib/ai/nvidia-nim';

describe('NVIDIA NIM Configuration & Client Settings', () => {
  it('initializes with the required NVIDIA NIM configuration', () => {
    const client = new NvidiaNimClient();

    expect(client.primaryModel).toBe('openai/gpt-oss-20b');
    expect(client.fallbackModel).toBe('nvidia/nemotron-3.5-lightning-30b-a3b');
    expect(client.maxTokens).toBe(2048);
    expect(client.temperature).toBe(0.1);
  });
});
