import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { callClaude } from "../../services/openrouter.js";
import { parseJsonDefensively } from "../../utils/parseJson.js";
import { FeedbackSchema } from "../../schemas/index.js";
import { logger } from "../../utils/logger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemPromptPath = path.resolve(__dirname, "../../prompts/extractor.system.md");
const systemPrompt = fs.readFileSync(systemPromptPath, "utf-8");
export const extractFeedback = async (state, config) => {
    logger.info("----------------------------------------------------------------");
    logger.info("  [1/4] Starting Phase 1: Feedback Extraction...");
    logger.info(`        Analyzing conversation transcript of ${state.transcript.length} turns.`);
    const transcriptText = state.transcript.map((t, i) => `[${i}] ${t.role}: ${t.text}`).join("\n");
    const userMessage = `Current System Prompt of the AI Agent:
${state.systemPrompt}

Transcript of the call to review:
${transcriptText}`;
    const response = await callClaude({
        systemPrompt,
        userMessage,
        temperature: 0.2,
        responseFormat: "json_object",
    });
    const parsed = parseJsonDefensively(response.content);
    const validated = FeedbackSchema.parse(parsed);
    logger.info(`  [1/4] Phase 1 Complete. Extracted: ${validated.issues.length} issues, ${validated.positives.length} positive remarks.`);
    return {
        extractedFeedback: validated,
    };
};
