import express from "express";
import { improvePrompt } from "./index.js";
import { logger } from "./utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * @api {post} /api/improve-prompt Evolve system prompt from transcript feedback
 * @apiBody {String} systemPrompt The AI agent's current system prompt.
 * @apiBody {Array} transcript The conversation transcript turns (role: 'agent'|'user'|'system', text: string).
 * @apiBody {Array} [invariants] Optional list of key phrases that must remain untouched.
 * @apiBody {Number} [maxRetries] Optional count for validation recovery loops (default 1).
 */
app.post("/api/improve-prompt", async (req, res) => {
  const { systemPrompt, transcript, invariants, maxRetries } = req.body;

  // Body Validation
  if (!systemPrompt || typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    return res.status(400).json({
      error: "Invalid input: 'systemPrompt' is required and must be a non-empty string.",
    });
  }

  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({
      error: "Invalid input: 'transcript' is required and must be a non-empty array of turns.",
    });
  }

  logger.info(
    { systemPromptLength: systemPrompt.length, turnsCount: transcript.length },
    "HTTP request received on POST /api/improve-prompt"
  );

  try {
    const result = await improvePrompt(systemPrompt, transcript, {
      invariants: invariants || [],
      maxRetries: maxRetries !== undefined ? Number(maxRetries) : 1,
    });

    return res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, "Error during HTTP prompt evolutionary traverse");
    return res.status(500).json({
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  return res.json({ status: "healthy", service: "voice-prompt-improver" });
});

app.listen(PORT, () => {
  logger.info(`================================================================`);
  logger.info(`  Voice Prompt Evolution Server is running on port ${PORT}      `);
  logger.info(`  Postman Target URL: POST http://localhost:${PORT}/api/improve-prompt `);
  logger.info(`  Health Check URL: GET http://localhost:${PORT}/api/health        `);
  logger.info(`================================================================`);
});
