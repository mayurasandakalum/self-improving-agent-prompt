import { describe, it, expect } from "vitest";
import { validatePrompt } from "../../src/graph/nodes/validatePrompt.js";

describe("validatePrompt node", () => {
  const original = "You are a customer support agent. Help users with their requests.";

  it("should pass when proposed prompt is valid", () => {
    const proposed = "You are a customer support agent. Help users with their requests and check account IDs.";
    const state: any = {
      systemPrompt: original,
      proposedPrompt: proposed,
      invariants: ["customer support agent"],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(true);
    expect(result.validationResult.failures).toHaveLength(0);
  });

  it("should fail when proposed prompt is empty", () => {
    const state: any = {
      systemPrompt: original,
      proposedPrompt: "",
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures).toContain("Proposed prompt is empty.");
  });

  it("should fail when proposed prompt is too short (<50%)", () => {
    const state: any = {
      systemPrompt: original,
      proposedPrompt: "Short.",
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("too short"))).toBe(true);
  });

  it("should fail when proposed prompt is too long (>200%)", () => {
    const state: any = {
      systemPrompt: original,
      proposedPrompt: "A".repeat(1000),
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("too long"))).toBe(true);
  });

  it("should fail when invariant is missing", () => {
    const state: any = {
      systemPrompt: original,
      proposedPrompt: "You are a sales agent. Help users with their requests.",
      invariants: ["customer support agent"],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("Invariant was removed or modified"))).toBe(true);
  });

  it("should fail when too many lines are changed (>40%)", () => {
    // Large rewrite
    const proposed = "Hello world!\n".repeat(20);
    const state: any = {
      systemPrompt: original,
      proposedPrompt: proposed,
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("Too many prompt modifications"))).toBe(true);
  });

  it("should fail when markdown backticks are unbalanced", () => {
    const proposed = "You are a customer support agent. Help users. ```json missing end tick";
    const state: any = {
      systemPrompt: original,
      proposedPrompt: proposed,
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("contains unbalanced markdown code blocks"))).toBe(
      true
    );
  });

  it("should fail when containing truncation keywords", () => {
    const proposed = "You are a customer support agent. Help users. ...truncated due to limits.";
    const state: any = {
      systemPrompt: original,
      proposedPrompt: proposed,
      invariants: [],
    };

    const result = validatePrompt(state, undefined);
    expect(result.validationResult.passed).toBe(false);
    expect(result.validationResult.failures.some((f) => f.includes("appears corrupted or truncated"))).toBe(true);
  });
});
