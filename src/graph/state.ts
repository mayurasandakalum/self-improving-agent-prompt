import { Annotation } from "@langchain/langgraph";
import { Turn, ValidationResult } from "../types.js";
import { Feedback, Analysis } from "../schemas/index.js";

export const GraphState = Annotation.Root({
  // Inputs
  systemPrompt: Annotation<string>,
  transcript: Annotation<Turn[]>,
  invariants: Annotation<string[]>({
    reducer: (a, b) => b ?? a,
    default: () => [],
  }),

  // Progressively filled state
  extractedFeedback: Annotation<Feedback | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  analysis: Annotation<Analysis | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  proposedPrompt: Annotation<string | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  changelog: Annotation<string[] | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  validationResult: Annotation<ValidationResult | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),

  // Control variables
  retryCount: Annotation<number>({
    reducer: (a, b) => a + b,
    default: () => 0,
  }),
  error: Annotation<string | null>({
    reducer: (a, b) => b ?? a,
    default: () => null,
  }),
  
  // Usage tracking
  tokens: Annotation<any>({
    reducer: (a, b) => {
      if (!a) return b;
      if (!b) return a;
      return {
        input: (a.input || 0) + (b.input || 0),
        output: (a.output || 0) + (b.output || 0),
        totalTokens: (a.totalTokens || 0) + (b.totalTokens || 0),
        cachedTokens: (a.cachedTokens || 0) + (b.cachedTokens || 0),
        reasoningTokens: (a.reasoningTokens || 0) + (b.reasoningTokens || 0),
      };
    },
    default: () => null,
  }),
  costDetails: Annotation<any>({
    reducer: (a, b) => {
      if (!a) return b;
      if (!b) return a;
      return {
        totalCost: Number(((a.totalCost || 0) + (b.totalCost || 0)).toFixed(4)),
        upstreamInferenceCost: Number(((a.upstreamInferenceCost || 0) + (b.upstreamInferenceCost || 0)).toFixed(4)),
        upstreamInferenceInputCost: Number(((a.upstreamInferenceInputCost || 0) + (b.upstreamInferenceInputCost || 0)).toFixed(4)),
        upstreamInferenceOutputCost: Number(((a.upstreamInferenceOutputCost || 0) + (b.upstreamInferenceOutputCost || 0)).toFixed(4)),
      };
    },
    default: () => null,
  }),
  stepCosts: Annotation<any[]>({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),
});

export type StateType = typeof GraphState.State;
