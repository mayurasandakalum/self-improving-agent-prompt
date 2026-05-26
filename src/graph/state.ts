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
});

export type StateType = typeof GraphState.State;
