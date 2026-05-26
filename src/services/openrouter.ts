import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export interface CallClaudeOptions {
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  responseFormat?: "json_object" | "text";
}

/**
 * Returns mock responses based on prompt and user message context.
 * This guarantees the pipeline can run, unit test, and manual CLI run completely fine
 * when no real OpenRouter API key is supplied.
 */
function getMockResponse(opts: CallClaudeOptions): string {
  const userMsg = opts.userMessage.toLowerCase();
  const systemMsg = opts.systemPrompt.toLowerCase();

  // Node 1: Feedback Extractor
  if (
    systemMsg.includes("expert conversational ai analyst") ||
    systemMsg.includes("issues, frustration, and successes")
  ) {
    if (userMsg.includes("cancel my order") && userMsg.includes("don't know how to do that")) {
      // Tool failure scenario
      return JSON.stringify({
        issues: [
          {
            type: "tool_failure",
            description:
              "The agent explicitly stated they do not know how to cancel the order, despite the customer's request.",
            evidenceTurnIndices: [3],
            severity: "high",
          },
        ],
        positives: [
          {
            description: "Agent greeted the customer politely and asked for the order number.",
            evidenceTurnIndices: [1],
          },
        ],
        callOutcome: "failure",
        overallSeverity: "high",
      });
    }

    if (userMsg.includes("alice smith") || userMsg.includes("acct-999")) {
      return JSON.stringify({
        issues: [
          {
            type: "repetition",
            description: "Agent asked for the customer's name multiple times, causing user frustration.",
            evidenceTurnIndices: [2, 4],
            severity: "medium",
          },
        ],
        positives: [],
        callOutcome: "partial",
        overallSeverity: "medium",
      });
    }

    if (userMsg.includes("basic monthly plan") || userMsg.includes("pricing")) {
      return JSON.stringify({
        issues: [
          {
            type: "missed_intent",
            description: "User asked about monthly pricing, but agent ignored it and pushed a sales pitch.",
            evidenceTurnIndices: [2],
            severity: "high",
          },
        ],
        positives: [],
        callOutcome: "partial",
        overallSeverity: "high",
      });
    }

    if (userMsg.includes("hawaii") || userMsg.includes("maui")) {
      return JSON.stringify({
        issues: [
          {
            type: "off_script",
            description:
              "Agent engaged in lengthy chit-chat about vacation and failed to steer the conversation back to the main booking task.",
            evidenceTurnIndices: [3, 4],
            severity: "medium",
          },
        ],
        positives: [],
        callOutcome: "partial",
        overallSeverity: "medium",
      });
    }

    // Default smooth or unclear call outcome
    return JSON.stringify({
      issues: [],
      positives: [
        {
          description: "All user intents resolved cleanly without friction.",
          evidenceTurnIndices: [1, 2, 3],
        },
      ],
      callOutcome: "success",
      overallSeverity: "low",
    });
  }

  // Node 2: Analyzer
  if (systemMsg.includes("root causes in the system prompt") || systemMsg.includes("shouldupdate")) {
    if (userMsg.includes("tool_failure")) {
      return JSON.stringify({
        rootCauses: [
          {
            issueRef: "The agent explicitly stated they do not know how to cancel the order",
            cause:
              "The system prompt does not instruct the agent on how to handle order cancellations or use the order cancellation tool.",
            affectedPromptSection: "missing",
            suggestedChange: "add",
          },
        ],
        shouldUpdate: true,
        reasoning:
          "Prompt needs to be updated with explicit instructions to handle order cancellations and use appropriate order cancellation tools.",
      });
    }

    if (userMsg.includes("repetition")) {
      return JSON.stringify({
        rootCauses: [
          {
            issueRef: "Agent asked for the customer's name multiple times",
            cause:
              "Prompt asks the agent to confirm the name but does not instruct them to write down or memorize it upon first mention.",
            affectedPromptSection: "Verify user details before proceeding.",
            suggestedChange: "clarify",
          },
        ],
        shouldUpdate: true,
        reasoning: "Clarify details verification step so name is not requested multiple times.",
      });
    }

    if (userMsg.includes("missed_intent")) {
      return JSON.stringify({
        rootCauses: [
          {
            issueRef: "User asked about monthly pricing, but agent ignored it",
            cause: "The system prompt is too rigid on pushing sales pitches and lacks pricing instruction.",
            affectedPromptSection: "Push the benefits of our premium plan.",
            suggestedChange: "modify",
          },
        ],
        shouldUpdate: true,
        reasoning: "Provide flexible guidelines for answering pricing inquiries before recommending plans.",
      });
    }

    if (userMsg.includes("off_script")) {
      return JSON.stringify({
        rootCauses: [
          {
            issueRef: "Agent engaged in lengthy chit-chat",
            cause: "Prompt does not place boundaries on pleasantries or direct how to politely pivot back to booking.",
            affectedPromptSection: "Be friendly and conversational.",
            suggestedChange: "clarify",
          },
        ],
        shouldUpdate: true,
        reasoning: "Provide friendly steering guidelines to limit excessive off-topic chit-chat.",
      });
    }

    // Default: smooth call, no update needed
    return JSON.stringify({
      rootCauses: [],
      shouldUpdate: false,
      reasoning:
        "The conversation was completed successfully with no issues identified. Prompt is functioning optimally.",
    });
  }

  // Node 3: Prompt Editor
  if (systemMsg.includes("rewrite the system prompt") || systemMsg.includes("changelog")) {
    // Extract the original prompt from the user message to keep changes realistic
    const originalPromptMatch = opts.userMessage.match(
      /(?:Current System Prompt|Current Prompt):\s*\n([\s\S]*?)\n\n(?:Engineering Analysis of Issues|Analysis):/i
    );
    const originalPrompt = originalPromptMatch
      ? originalPromptMatch[1].trim()
      : "You are a helpful customer support agent.";

    let newPrompt = originalPrompt;
    let changelog = "- General prompt improvements.";

    if (userMsg.includes("cancel") || userMsg.includes("tool_failure")) {
      newPrompt = `${originalPrompt}\n\nWhen a customer asks to cancel their order, check if you have an order number. If yes, inform them you will initiate the cancellation. If they do not provide one, ask for it.`;
      changelog =
        "- Added instructions on how to handle order cancellations.\n- Instructed agent to ask for order numbers explicitly when missing.";
    } else if (userMsg.includes("verification") || userMsg.includes("repetition")) {
      newPrompt = originalPrompt.replace(
        "Verify user details before proceeding.",
        "Verify user details once. Do not repeat questions if customer already gave information."
      );
      changelog = "- Clarified detail verification step to prevent repetitive questions.";
    } else if (userMsg.includes("pricing") || userMsg.includes("missed_intent")) {
      newPrompt = originalPrompt.replace(
        "Push the benefits of our premium plan.",
        "Answer pricing inquiries directly if asked, then highlight the benefits of our premium plan."
      );
      changelog = "- Modified sales pitch directive to allow responding to direct pricing questions.";
    } else if (userMsg.includes("chit-chat") || userMsg.includes("off_script")) {
      newPrompt = originalPrompt.replace(
        "Be friendly and conversational.",
        "Be friendly and conversational, but keep chit-chat minimal. Pivot back to the booking flow within one turn if user goes off-topic."
      );
      changelog = "- Added guidelines for polite redirection and minimal chit-chat.";
    }

    // Format output
    return `## Updated Prompt\n${newPrompt}\n\n## Changelog\n${changelog}`;
  }

  return "Mock response";
}

/**
 * Executes a call to the LLM (Claude) via OpenRouter, with a fallback to mock mode if no API key is set.
 */
export async function callClaude(
  opts: CallClaudeOptions
): Promise<{ content: string; tokens: { input: number; output: number } }> {
  const isMockMode = !config.OPENROUTER_API_KEY || config.OPENROUTER_API_KEY === "your_openrouter_api_key_here";

  if (isMockMode) {
    logger.info("OpenRouter API key not configured or set to placeholder. Running in MOCK mode.");

    // Simulate slight latency (200ms) for high fidelity feel
    await new Promise((resolve) => setTimeout(resolve, 200));

    const content = getMockResponse(opts);
    return {
      content,
      tokens: {
        input: Math.ceil(opts.userMessage.length / 4) + Math.ceil(opts.systemPrompt.length / 4),
        output: Math.ceil(content.length / 4),
      },
    };
  }

  logger.debug({ model: config.OPENROUTER_MODEL, temperature: opts.temperature }, "Calling Claude via OpenRouter API");

  try {
    const model = new ChatOpenAI({
      modelName: config.OPENROUTER_MODEL,
      temperature: opts.temperature,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: config.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": config.OPENROUTER_HTTP_REFERER,
          "X-Title": config.OPENROUTER_X_TITLE,
        },
      },
      maxRetries: config.DEFAULT_MAX_RETRIES + 2, // 3 attempts total
    });

    const messages = [new SystemMessage(opts.systemPrompt), new HumanMessage(opts.userMessage)];

    const response = await model.invoke(messages, {
      timeout: config.DEFAULT_TIMEOUT_MS,
    });

    const content = response.content as string;
    const tokens = {
      input: response.response_metadata?.tokenUsage?.promptTokens || 0,
      output: response.response_metadata?.tokenUsage?.completionTokens || 0,
    };

    return { content, tokens };
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during OpenRouter Claude call");
    throw error;
  }
}
