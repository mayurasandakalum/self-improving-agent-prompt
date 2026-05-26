import { describe, it, expect, vi, beforeEach } from "vitest";
// Mock the openrouter service
vi.mock("../../src/services/openrouter.js", () => {
    return {
        callClaude: vi.fn(),
    };
});
import { callClaude } from "../../src/services/openrouter.js";
import { extractFeedback } from "../../src/graph/nodes/extractFeedback.js";
import { analyzeFeedback } from "../../src/graph/nodes/analyzeFeedback.js";
import { editPrompt } from "../../src/graph/nodes/editPrompt.js";
describe("Graph Nodes Isolated Unit Tests", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });
    describe("extractFeedback node", () => {
        it("should successfully extract feedback and format it correctly", async () => {
            const mockFeedback = {
                issues: [
                    {
                        type: "tool_failure",
                        description: "Agent didn't call the cancel tool.",
                        evidenceTurnIndices: [2],
                        severity: "high",
                    },
                ],
                positives: [],
                callOutcome: "failure",
                overallSeverity: "high",
            };
            vi.mocked(callClaude).mockResolvedValue({
                content: JSON.stringify(mockFeedback),
                tokens: { input: 100, output: 50 },
            });
            const state = {
                systemPrompt: "Agent prompt here",
                transcript: [{ role: "user", text: "cancel my order" }],
                invariants: [],
            };
            const result = await extractFeedback(state, undefined);
            expect(callClaude).toHaveBeenCalledOnce();
            expect(result).toHaveProperty("extractedFeedback");
            expect(result.extractedFeedback).toEqual(mockFeedback);
        });
    });
    describe("analyzeFeedback node", () => {
        it("should successfully analyze feedback root causes", async () => {
            const mockAnalysis = {
                rootCauses: [
                    {
                        issueRef: "tool_failure",
                        cause: "Missing cancellation step.",
                        affectedPromptSection: "missing",
                        suggestedChange: "add",
                    },
                ],
                shouldUpdate: true,
                reasoning: "Needs cancellation rules.",
            };
            vi.mocked(callClaude).mockResolvedValue({
                content: JSON.stringify(mockAnalysis),
                tokens: { input: 150, output: 80 },
            });
            const state = {
                systemPrompt: "Agent prompt here",
                extractedFeedback: {
                    issues: [{ type: "tool_failure", description: "Friction", evidenceTurnIndices: [2], severity: "high" }],
                    positives: [],
                    callOutcome: "failure",
                    overallSeverity: "high",
                },
            };
            const result = await analyzeFeedback(state, undefined);
            expect(callClaude).toHaveBeenCalledOnce();
            expect(result).toHaveProperty("analysis");
            expect(result.analysis).toEqual(mockAnalysis);
        });
    });
    describe("editPrompt node", () => {
        it("should call editor and return proposed prompt with changelog", async () => {
            const mockLLMResponse = `
## Updated Prompt
You are a customer support agent. If a user asks to cancel their order, trigger the cancel_order tool immediately.

## Changelog
- Added cancellation instructions.
`;
            vi.mocked(callClaude).mockResolvedValue({
                content: mockLLMResponse,
                tokens: { input: 200, output: 120 },
            });
            const state = {
                systemPrompt: "You are a customer support agent.",
                analysis: {
                    rootCauses: [],
                    shouldUpdate: true,
                    reasoning: "Prompt needs updating.",
                },
                invariants: ["customer support agent"],
                validationResult: null,
            };
            const result = await editPrompt(state, undefined);
            expect(callClaude).toHaveBeenCalledOnce();
            expect(result).toHaveProperty("proposedPrompt");
            expect(result.proposedPrompt).toContain("trigger the cancel_order tool immediately");
            expect(result.changelog).toEqual(["Added cancellation instructions."]);
        });
    });
});
