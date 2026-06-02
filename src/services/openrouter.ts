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
): Promise<{
  content: string;
  tokens: { 
    input: number; 
    output: number;
    totalTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  };
  costDetails: {
    totalCost: number;
    upstreamInferenceCost?: number;
    upstreamInferenceInputCost?: number;
    upstreamInferenceOutputCost?: number;
  };
}> {
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
    const response = await result.getResponse();

    const tokens = {
      input: response.usage?.inputTokens ?? 0,
      output: response.usage?.outputTokens ?? 0,
      totalTokens: response.usage?.totalTokens ?? 0,
      cachedTokens: response.usage?.inputTokensDetails?.cachedTokens ?? 0,
      reasoningTokens: response.usage?.outputTokensDetails?.reasoningTokens ?? 0,
    };

    const formatCost = (val: number | null | undefined): number | undefined => {
      if (typeof val === "number") {
        return Number(val.toFixed(4));
      }
      return undefined;
    };

    const costDetails = {
      totalCost: formatCost(response.usage?.cost) ?? 0,
      upstreamInferenceCost: formatCost(response.usage?.costDetails?.upstreamInferenceCost),
      upstreamInferenceInputCost: formatCost(response.usage?.costDetails?.upstreamInferenceInputCost),
      upstreamInferenceOutputCost: formatCost(response.usage?.costDetails?.upstreamInferenceOutputCost),
    };

    return { content, tokens, costDetails };
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during OpenRouter Claude call");
    throw error;
  }
}
