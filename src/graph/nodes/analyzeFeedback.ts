import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RunnableConfig } from "@langchain/core/runnables";
import { GraphState, StateType } from "../state.js";
import { callClaude } from "../../services/openrouter.js";
import { parseJsonDefensively } from "../../utils/parseJson.js";
import { AnalysisSchema } from "../../schemas/index.js";

import { logger } from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemPromptPath = path.resolve(__dirname, "../../prompts/analyzer.system.md");
const systemPrompt = fs.readFileSync(systemPromptPath, "utf-8");

export const analyzeFeedback = async (state: StateType, config?: RunnableConfig) => {
  logger.info("  [2/4] Starting Phase 2: Root-Cause Prompt Analysis...");

  if (!state.extractedFeedback) {
    throw new Error("Cannot run analyzeFeedback: extractedFeedback is null.");
  }

  const userMessage = `Current System Prompt:
${state.systemPrompt}

Extracted Feedback:
${JSON.stringify(state.extractedFeedback, null, 2)}`;

  const response = await callClaude({
    systemPrompt,
    userMessage,
    temperature: 0.3,
    responseFormat: "json_object",
  });

  const parsed = parseJsonDefensively(response.content);
  const validated = AnalysisSchema.parse(parsed);

  logger.info(`  [2/4] Phase 2 Complete. Decision to evolve system prompt: ${validated.shouldUpdate ? "YES" : "NO"}`);
  if (!validated.shouldUpdate) {
    logger.info("        No improvements needed. Bypassing prompt rewriting.");
  }
  return {
    analysis: validated,
  };
};
