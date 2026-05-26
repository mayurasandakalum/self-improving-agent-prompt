import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const configSchema = z.object({
    OPENROUTER_API_KEY: z.string().default("your_openrouter_api_key_here"),
    OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-sonnet:beta"),
    OPENROUTER_HTTP_REFERER: z.string().default("https://yourcompany.example"),
    OPENROUTER_X_TITLE: z.string().default("voice-prompt-improver"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
    DEFAULT_MAX_RETRIES: z.coerce.number().default(1),
    DEFAULT_TIMEOUT_MS: z.coerce.number().default(60000),
});
export const config = configSchema.parse(process.env);
