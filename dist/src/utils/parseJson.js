import { logger } from "./logger.js";
/**
 * Defensive JSON parsing helper to deal with LLM outputs that might be wrapped in
 * markdown fences, contain trailing whitespace, or leading/trailing conversational text.
 */
export function parseJsonDefensively(text) {
    const trimmed = text.trim();
    // Try direct parse first
    try {
        return JSON.parse(trimmed);
    }
    catch (e) {
        // Continue to next strategies
    }
    // Strip Markdown JSON block code blocks if present
    try {
        const cleanText = text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*$/g, "")
            .trim();
        return JSON.parse(cleanText);
    }
    catch (e) {
        // Continue to regex strategy
    }
    // Regex extraction of the outer-most JSON object or array
    try {
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    }
    catch (e) {
        // Continue to throw error
    }
    logger.error({ rawContent: text }, "Defensive JSON parser failed to extract valid JSON.");
    throw new Error(`Failed to parse LLM JSON output. Content was: ${text.slice(0, 500)}...`);
}
