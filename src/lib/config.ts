import { z } from 'zod';

const optionalSecret = z.string().trim().min(1).optional();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().trim().min(1).default('file:./dev.db'),
  APP_SECRET: optionalSecret,
  TOKEN_ENCRYPTION_KEY: optionalSecret,
  NVIDIA_API_KEY: optionalSecret,
  NVIDIA_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_PRIMARY_MODEL: z.string().trim().min(1),
  NVIDIA_FALLBACK_MODEL: z.string().trim().optional(),
  NVIDIA_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().max(8192).default(2048),
  NVIDIA_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(90).default(30),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

export type RuntimeConfig = z.infer<typeof envSchema>;

let cachedConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(validateProductionSecrets = true): RuntimeConfig {
  if (cachedConfig) {
    if (validateProductionSecrets) validateProductionConfig(cachedConfig);
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid runtime configuration: ${parsed.error.message}`);
  }

  const config = parsed.data;
  if (validateProductionSecrets) validateProductionConfig(config);

  cachedConfig = config;
  return config;
}

function validateProductionConfig(config: RuntimeConfig): void {
  if (config.NODE_ENV === 'production') {
    if (!/^(postgresql|postgres):\/\//.test(config.DATABASE_URL)) {
      throw new Error('DATABASE_URL must use PostgreSQL in production');
    }

    const required: Array<keyof RuntimeConfig> = ['APP_SECRET', 'TOKEN_ENCRYPTION_KEY', 'NVIDIA_API_KEY'];
    const missing = required.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
    }

    for (const key of ['APP_SECRET', 'TOKEN_ENCRYPTION_KEY'] as const) {
      if (!/^[a-f0-9]{64}$/i.test(config[key] ?? '')) {
        throw new Error(`${key} must be a 64-character hexadecimal value in production`);
      }
    }
  }
}

export function resetRuntimeConfigForTests(): void {
  cachedConfig = undefined;
}

export function requireConfigured(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured. Add it to the environment before using this feature.`);
  }
  return value;
}
