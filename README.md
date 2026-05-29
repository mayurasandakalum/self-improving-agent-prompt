# Voice Prompt Improver 🎙️🤖

An intelligent, autonomous, self-improving prompt evolution module built on a robust state machine architecture. This standalone service optimizes an AI voice agent's system prompt by analyzing voice conversation transcripts, highlighting areas of friction, tracing them back to root causes in the prompt, proposing edits, and validating those changes through deterministic guards.

Designed as a modular package, it easily drops into any backend API queue or background task worker (e.g., BullMQ) to recursively optimize prompts post-call.

---

## Key Features

- **Autonomous Signal Detection**: Extracts user frustration, confusion, repetition, tool failures, and missed intent directly from transcript patterns. No explicit user rating required.
- **State Machine Optimization**: Orchestrates multi-node LLM and validation logic using a linear **LangGraph JS** architecture.
- **Recursive Validation Loop**: Automatically runs deterministic validation rules on proposed prompts, looping back to the editor with validation failures up to a configurable maximum retry limit.
- **Deterministic Guards**:
  - **Invariant Preservation**: Guarantees core business logic, compliance rules, or branding keywords are never lost.
  - **Length Checking**: Restricts changes within a $50\% - 200\%$ length boundary of the original prompt.
  - **Line Difference Ceilings**: Limits overall structural rewrites to at most $40\%$ modified lines.
  - **Corruption Check**: Prevents unbalanced markdown block tags or LLM truncation markers.
- **Robust Mock Mode**: Seamlessly runs and tests the entire pipeline locally without requiring a configured OpenRouter key.

---

## Architectural Workflow

```
[System Prompt & Transcript]
            │
            ▼
    [Feedback Extractor]  ───► Extracts issues and successes from conversation
            │
            ▼
        [Analyzer]        ───► Maps issues to prompt sections & defines causes
            │
      (shouldUpdate?)
       ├─── No  ─────────────► [Exit: Original Prompt]
       └─── Yes ─────────────► [Prompt Editor] ◄──────┐
                                     │               │ (Retry Loop)
                                     ▼               │
                                [Validator] ─────────┘
                                     │
                             (passed / retries?)
                                     ├─── Fail ──────► [Exit: originalPrompt + failures]
                                     └─── Pass ──────► [Exit: newPrompt + changelog]
```

---

## Installation

Ensure you have Node.js version 20+ installed. Install the package dependencies using:

```bash
npm install
```

---

## Configuration

Duplicate `.env.example` as `.env` and fill in your OpenRouter configurations:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-opus-4.8
LOG_LEVEL=info
```

*Note: If `OPENROUTER_API_KEY` is absent or set to the placeholder `your_openrouter_api_key_here`, the module runs automatically in a high-fidelity **Mock Mode** using realistic context-sensitive results.*

---

## Usage

Exposes a single public async function: `improvePrompt(systemPrompt, transcript, options)`.

```typescript
import { improvePrompt } from "voice-prompt-improver";

const transcript = [
  { role: "user", text: "I need to cancel my reservation." },
  { role: "agent", text: "Sure! What is your account number?" },
  { role: "user", text: "It's ACCT-123." },
  { role: "agent", text: "I'm sorry, I don't know how to do that." }
];

const originalPrompt = "You are a customer support agent. Be polite.";

const result = await improvePrompt(originalPrompt, transcript, {
  invariants: ["customer support agent"],
  maxRetries: 2
});

console.log(result.newPrompt);
console.log(result.changelog);
console.log(result.metadata.diff);
```

### Result Schema

```typescript
{
  newPrompt: string; // The newly evolved prompt
  changelog: string[]; // List of specific edits made
  metadata: {
    extractedFeedback: Feedback; // Positive and negative signals detected
    analysis: Analysis; // Root-cause mapping to prompt sections
    diff: string; // Markdown git diff format of the change
    retryCount: number; // Number of loops executed to pass validation
    durationMs: number; // Processing duration in milliseconds
  }
}
```

---

## Development & Manual Verification

To run a specific transcript scenario fixture and trace the state machine step-by-step in the terminal, run the dev CLI script:

```bash
# Runs the default tool_failure fixture
npm run run:dev

# Or pass a custom fixture path
npm run run:dev -- tests/fixtures/transcripts/repetition_issue.json
```

---

## Testing Strategy

Runs on **Vitest** for blistering fast performance and strict typing:

```bash
# Run unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch
```

- **Unit Tests**: Coverage for deterministic validation, defensive JSON parsers, and LangGraph nodes in absolute isolation utilizing mocks.
- **E2E/Integration Tests**: Validates the end-to-end traversal of the StateGraph machine across 5 hand-crafted scenario files.
