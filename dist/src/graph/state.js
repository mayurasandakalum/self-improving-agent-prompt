import { Annotation } from "@langchain/langgraph";
export const GraphState = Annotation.Root({
    // Inputs
    systemPrompt: (Annotation),
    transcript: (Annotation),
    invariants: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => [],
    }),
    // Progressively filled state
    extractedFeedback: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
    analysis: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
    proposedPrompt: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
    changelog: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
    validationResult: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
    // Control variables
    retryCount: Annotation({
        reducer: (a, b) => a + b,
        default: () => 0,
    }),
    error: Annotation({
        reducer: (a, b) => b ?? a,
        default: () => null,
    }),
});
