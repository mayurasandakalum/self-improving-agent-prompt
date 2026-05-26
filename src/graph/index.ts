import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { extractFeedback } from "./nodes/extractFeedback.js";
import { analyzeFeedback } from "./nodes/analyzeFeedback.js";
import { editPrompt } from "./nodes/editPrompt.js";
import { validatePrompt } from "./nodes/validatePrompt.js";

// Construct the state graph
const graphBuilder = new StateGraph(GraphState)
  .addNode("extractFeedback", extractFeedback)
  .addNode("analyzeFeedback", analyzeFeedback)
  .addNode("editPrompt", editPrompt)
  .addNode("validatePrompt", validatePrompt)

  // Start with feedback extraction
  .addEdge(START, "extractFeedback")

  // Go from extraction to analysis
  .addEdge("extractFeedback", "analyzeFeedback")

  // Determine if update is needed from analysis node
  .addConditionalEdges("analyzeFeedback", (state) => {
    if (state.analysis?.shouldUpdate) {
      return "editPrompt";
    }
    return END;
  })

  // Once prompt is edited, send to validation
  .addEdge("editPrompt", "validatePrompt")

  // Check validation results and handle retry loop
  .addConditionalEdges("validatePrompt", (state, config) => {
    if (state.validationResult?.passed) {
      return END;
    }

    const maxRetries = config?.configurable?.maxRetries ?? 1;
    if (state.retryCount < maxRetries) {
      return "editPrompt";
    }

    return END;
  });

export const promptImproverGraph = graphBuilder.compile();
export type PromptImproverGraphType = typeof promptImproverGraph;
