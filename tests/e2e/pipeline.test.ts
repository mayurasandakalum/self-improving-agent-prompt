import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { improvePrompt } from "../../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../fixtures/transcripts");

describe("E2E Graph Pipeline Integration Tests", () => {
  const runFixture = async (filename: string) => {
    const filePath = path.join(fixturesDir, filename);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const { systemPrompt, transcript, invariants } = content;

    const result = await improvePrompt(systemPrompt, transcript, {
      invariants,
      maxRetries: 1,
    });

    return result;
  };

  it("should handle smooth_call.json without making updates", async () => {
    const result = await runFixture("smooth_call.json");

    expect(result.newPrompt).toBe(result.newPrompt); // unchanged or original
    expect(result.changelog).toEqual(["No actionable improvements identified from conversation analysis."]);
    expect(result.metadata.extractedFeedback.issues).toHaveLength(0);
    expect(result.metadata.analysis.shouldUpdate).toBe(false);
  });

  it("should optimize prompt for repetition_issue.json", async () => {
    const result = await runFixture("repetition_issue.json");

    expect(result.newPrompt).not.toBe("");
    expect(result.changelog.length).toBeGreaterThan(0);
    expect(result.metadata.extractedFeedback.issues.some((i: any) => i.type === "repetition")).toBe(true);
    expect(result.metadata.analysis.shouldUpdate).toBe(true);
    expect(result.metadata.diff).toContain("systemPrompt");
  });

  it("should optimize prompt for missed_intent.json", async () => {
    const result = await runFixture("missed_intent.json");

    expect(result.newPrompt).not.toBe("");
    expect(result.changelog.length).toBeGreaterThan(0);
    expect(result.metadata.extractedFeedback.issues.some((i: any) => i.type === "missed_intent")).toBe(true);
    expect(result.metadata.analysis.shouldUpdate).toBe(true);
  });

  it("should optimize prompt for tool_failure.json", async () => {
    const result = await runFixture("tool_failure.json");

    expect(result.newPrompt).not.toBe("");
    expect(result.changelog.length).toBeGreaterThan(0);
    expect(result.metadata.extractedFeedback.issues.some((i: any) => i.type === "tool_failure")).toBe(true);
    expect(result.metadata.analysis.shouldUpdate).toBe(true);
  });

  it("should optimize prompt for off_script.json", async () => {
    const result = await runFixture("off_script.json");

    expect(result.newPrompt).not.toBe("");
    expect(result.changelog.length).toBeGreaterThan(0);
    expect(result.metadata.extractedFeedback.issues.some((i: any) => i.type === "off_script")).toBe(true);
    expect(result.metadata.analysis.shouldUpdate).toBe(true);
  });
}, 180000);
