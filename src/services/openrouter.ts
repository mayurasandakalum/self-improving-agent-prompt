import { OpenRouter } from "@openrouter/sdk";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export interface CallClaudeOptions {
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  responseFormat?: "json_object" | "text";
}

/**
 * Executes a call to the LLM (Claude) via OpenRouter.
 */
export async function callClaude(
  opts: CallClaudeOptions
): Promise<{ content: string; tokens: { input: number; output: number } }> {
  logger.debug({ model: config.OPENROUTER_MODEL, temperature: opts.temperature }, "Calling Claude via OpenRouter API");

  try {
    const client = new OpenRouter({ apiKey: config.OPENROUTER_API_KEY });
    const result = client.callModel({
      model: config.OPENROUTER_MODEL,
      instructions: opts.systemPrompt,
      input: [{ role: "user", content: opts.userMessage }],
      // Include temperature if supported by SDK. Note: OpenRouter SDK might pass unknown props to the API.
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
    });

    const content = await result.getText();

    // The SDK currently abstracts away tokens, using default 0 for now to satisfy types
    const tokens = {
      input: 0,
      output: 0,
    };

    return { content, tokens };
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during OpenRouter Claude call");
    throw error;
  }
}
