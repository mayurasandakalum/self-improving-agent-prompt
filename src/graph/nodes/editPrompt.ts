import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RunnableConfig } from "@langchain/core/runnables";
import { GraphState, StateType } from "../state.js";
import { callClaude } from "../../services/openrouter.js";
import { logger } from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemPromptPath = path.resolve(__dirname, "../../prompts/editor.system.md");
const systemPrompt = fs.readFileSync(systemPromptPath, "utf-8");

export const editPrompt = async (state: StateType, config?: RunnableConfig) => {
  const isRetry = state.validationResult && !state.validationResult.passed;
  if (isRetry) {
    logger.warn(`  [3/4] Retrying Phase 3: Prompt Engineering Evolution (Attempt ${state.retryCount + 1})...`);
    logger.warn(`        Addressing validation failures: ${state.validationResult?.failures.length} errors.`);
  } else {
    logger.info("  [3/4] Starting Phase 3: Prompt Engineering Evolution (Claude Editor)...");
  }

  if (!state.analysis) {
    throw new Error("Cannot run editPrompt: analysis is null.");
  }

  let userMessage = `Current System Prompt:
${state.systemPrompt}

Engineering Analysis of Issues:
${JSON.stringify(state.analysis, null, 2)}
`;

  // Append previous validation failures if we are in a retry loop
  if (state.validationResult && !state.validationResult.passed) {
    userMessage += `\nPREVIOUS ATTEMPT FAILED DETERMINISTIC VALIDATION.
You must correct the issues below while maintaining invariants:
${state.validationResult.failures.map((f: string) => `- ${f}`).join("\n")}
`;
  }

  const response = await callClaude({
    systemPrompt,
    userMessage,
    temperature: 0.4,
  });

  const content = response.content;

  // Split updated prompt and changelog defensively
  let proposedPrompt = "";
  let changelog: string[] = [];

  const splitMarker = /##\s*changelog/i;
  const match = content.split(splitMarker);

  if (match.length >= 2) {
    proposedPrompt = match[0].replace(/##\s*updated\s*prompt/gi, "").trim();
    const changelogText = match[1].trim();
    changelog = changelogText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-") || line.startsWith("*"))
      .map((line) => line.replace(/^[-*]\s*/, "").trim());
  } else {
    // Fallback if formatting was slightly missed
    proposedPrompt = content.replace(/##\s*updated\s*prompt/gi, "").trim();
    changelog = ["Updated prompt instructions based on transcript feedback."];
  }

  // Determine if we should increment retry count
  const retryIncrement = isRetry ? 1 : 0;

  logger.info(`  [3/4] Phase 3 Complete. Generated proposed prompt and changelog of ${changelog.length} items.`);
  return {
    proposedPrompt,
    changelog,
    retryCount: retryIncrement,
  };
};
