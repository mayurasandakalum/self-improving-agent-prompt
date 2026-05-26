import { RunnableConfig } from "@langchain/core/runnables";
import { GraphState, StateType } from "../state.js";
import * as diffLib from "diff";
import { logger } from "../../utils/logger.js";

export const validatePrompt = (state: StateType, config?: RunnableConfig) => {
  logger.info("  [4/4] Starting Phase 4: Deterministic Guard Validation...");

  const original = state.systemPrompt;
  const proposed = state.proposedPrompt || "";
  const invariants = state.invariants || [];
  const failures: string[] = [];

  // 1. Non-empty
  if (!proposed.trim()) {
    failures.push("Proposed prompt is empty.");
  }

  // 2. Length bounds (within 50% - 200%, with a baseline minimum maximum of 800 chars for short prompts)
  const minLength = original.length * 0.5;
  const maxLength = Math.max(original.length * 2.0, 800);
  if (proposed.length < minLength) {
    failures.push(
      `Proposed prompt is too short (${proposed.length} chars) compared to original (${original.length} chars). Must be at least 50% (${Math.round(minLength)} chars).`
    );
  }
  if (proposed.length > maxLength) {
    failures.push(
      `Proposed prompt is too long (${proposed.length} chars) compared to original (${original.length} chars). Must be at most ${Math.round(maxLength)} chars.`
    );
  }

  // 3. Invariants present
  for (const invariant of invariants) {
    if (!proposed.includes(invariant)) {
      failures.push(`Invariant was removed or modified: "${invariant}"`);
    }
  }

  // 4. Diff size: changed lines <= 40% of original line count
  const originalLines = original.split("\n");
  const originalLineCount = originalLines.length || 1;
  const diffs = diffLib.diffLines(original, proposed);

  let changedLinesCount = 0;
  for (const diff of diffs) {
    if (diff.added || diff.removed) {
      changedLinesCount += diff.count ?? 0;
    }
  }

  const changeRatio = changedLinesCount / originalLineCount;
  const maxAllowedRatio = 0.4;
  if (originalLineCount >= 5 && changeRatio > maxAllowedRatio) {
    failures.push(
      `Too many prompt modifications. Changed lines: ${changedLinesCount} out of ${originalLineCount} total original lines (${Math.round(changeRatio * 100)}%). Max allowed is 40%.`
    );
  } else if (originalLineCount < 5 && changedLinesCount > 15) {
    failures.push(
      `Too many prompt modifications for a short prompt. Changed lines: ${changedLinesCount}. Max allowed is 15 lines.`
    );
  }

  // 5. No obvious corruption (unclosed backticks or truncation strings)
  const backtickCount = (proposed.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) {
    failures.push("Proposed prompt contains unbalanced markdown code blocks (odd number of triple backticks).");
  }

  const lowerProposed = proposed.toLowerCase();
  if (lowerProposed.includes("...truncated") || lowerProposed.includes("[continued]")) {
    failures.push(
      "Proposed prompt appears corrupted or truncated (contains placeholder text like '...truncated' or '[continued]')."
    );
  }

  const passed = failures.length === 0;
  if (passed) {
    logger.info("  [4/4] Phase 4 Validation PASSED.");
    logger.info("----------------------------------------------------------------");
  } else {
    logger.warn(`  [4/4] Phase 4 Validation FAILED with ${failures.length} issues:`);
    failures.forEach((f) => logger.warn(`        - ${f}`));
    logger.warn("----------------------------------------------------------------");
  }

  return {
    validationResult: {
      passed,
      failures,
    },
  };
};
