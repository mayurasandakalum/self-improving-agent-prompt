import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OpenRouter API key is required"),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-opus-4.8"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DEFAULT_MAX_RETRIES: z.coerce.number().default(1),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(60000),
});

export const config = configSchema.parse(process.env);
