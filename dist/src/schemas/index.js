import { z } from "zod";
export const FeedbackSchema = z.object({
    issues: z.array(z.object({
        type: z.enum(["confusion", "frustration", "missed_intent", "tool_failure", "off_script", "repetition", "other"]),
        description: z.string(),
        evidenceTurnIndices: z.array(z.number()),
        severity: z.enum(["low", "medium", "high"]),
    })),
    positives: z.array(z.object({
        description: z.string(),
        evidenceTurnIndices: z.array(z.number()),
    })),
    callOutcome: z.enum(["success", "partial", "failure", "unclear"]),
    overallSeverity: z.enum(["low", "medium", "high"]),
});
export const AnalysisSchema = z.object({
    rootCauses: z.array(z.object({
        issueRef: z.string(),
        cause: z.string(),
        affectedPromptSection: z.string(),
        suggestedChange: z.enum(["modify", "add", "remove", "clarify"]),
    })),
    shouldUpdate: z.boolean(),
    reasoning: z.string(),
});
