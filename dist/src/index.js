import { promptImproverGraph } from "./graph/index.js";
import * as diffLib from "diff";
/**
 * Public API to run the prompt evolution graph pipeline.
 *
 * @param systemPrompt The AI agent's current system prompt.
 * @param transcript The voice conversation transcript turns.
 * @param options Additional control configurations (invariants, retries, timeout).
 */
export async function improvePrompt(systemPrompt, transcript, options) {
    // Validate inputs defensively
    if (!systemPrompt || !systemPrompt.trim()) {
        throw new Error("Invalid input: systemPrompt cannot be empty.");
    }
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
        throw new Error("Invalid input: transcript must be a non-empty array of turns.");
    }
    const startTime = Date.now();
    // Run the LangGraph compilation
    const finalState = await promptImproverGraph.invoke({
        systemPrompt,
        transcript,
        invariants: options?.invariants || [],
    }, {
        configurable: {
            maxRetries: options?.maxRetries ?? 1,
        },
        recursionLimit: 20, // generous safety limit for looping graph nodes
    });
    const durationMs = Date.now() - startTime;
    // If there was an error in state, throw it
    if (finalState.error) {
        throw new Error(`Graph execution encountered an error: ${finalState.error}`);
    }
    // Handle Validation Failures if retry limit was reached without passing
    if (finalState.validationResult && !finalState.validationResult.passed) {
        throw new Error(`Prompt improvement failed validation after ${finalState.retryCount} retries. Reasons:\n${finalState.validationResult.failures.map((f) => `- ${f}`).join("\n")}`);
    }
    // Case: No actionable changes identified by analyzer
    if (finalState.analysis && !finalState.analysis.shouldUpdate) {
        return {
            newPrompt: systemPrompt,
            changelog: ["No actionable improvements identified from conversation analysis."],
            metadata: {
                extractedFeedback: finalState.extractedFeedback,
                analysis: finalState.analysis,
                diff: "",
                retryCount: finalState.retryCount,
                durationMs,
            },
        };
    }
    // Case: Success
    const proposed = finalState.proposedPrompt || systemPrompt;
    const changelog = finalState.changelog || ["Prompt revised to enhance interaction characteristics."];
    const patch = diffLib.createPatch("systemPrompt", systemPrompt, proposed);
    return {
        newPrompt: proposed,
        changelog,
        metadata: {
            extractedFeedback: finalState.extractedFeedback,
            analysis: finalState.analysis,
            diff: patch,
            retryCount: finalState.retryCount,
            durationMs,
        },
    };
}
