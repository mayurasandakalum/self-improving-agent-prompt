import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { improvePrompt } from "../src/index.js";
import { logger } from "../src/utils/logger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function run() {
    // Grab fixture path from args or default to tool_failure
    const args = process.argv.slice(2);
    let fixtureRelativePath = args[0] || "tests/fixtures/transcripts/tool_failure.json";
    const fixturePath = path.resolve(__dirname, "..", fixtureRelativePath);
    logger.info(`Loading fixture file: ${fixturePath}`);
    if (!fs.existsSync(fixturePath)) {
        logger.error(`Fixture file not found at ${fixturePath}`);
        process.exit(1);
    }
    const fixtureContent = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const { systemPrompt, transcript, invariants } = fixtureContent;
    logger.info("Initializing improvePrompt Graph Execution...");
    try {
        const result = await improvePrompt(systemPrompt, transcript, {
            invariants,
            maxRetries: 1,
        });
        console.log("\n==================================================");
        console.log("            PIPELINE RUN COMPLETE");
        console.log("==================================================");
        console.log("\n--- ORIGINAL PROMPT ---");
        console.log(systemPrompt);
        console.log("\n--- EXTRACTED ISSUES ---");
        console.log(JSON.stringify(result.metadata.extractedFeedback?.issues || [], null, 2));
        console.log("\n--- ANALYSIS ---");
        console.log(JSON.stringify(result.metadata.analysis || {}, null, 2));
        console.log("\n--- NEW SYSTEM PROMPT ---");
        console.log(result.newPrompt);
        console.log("\n--- CHANGELOG ---");
        result.changelog.forEach((c) => console.log(`- ${c}`));
        console.log("\n--- DIFFERENCE PATCH ---");
        if (result.metadata.diff) {
            console.log(result.metadata.diff);
        }
        else {
            console.log("No modifications made.");
        }
        console.log("\n--- METADATA ---");
        console.log(`Duration: ${result.metadata.durationMs}ms`);
        console.log(`Retry Count: ${result.metadata.retryCount}`);
        console.log("==================================================\n");
    }
    catch (error) {
        logger.error({ error: error.message }, "Pipeline execution failed!");
        process.exit(1);
    }
}
run().catch((err) => {
    logger.error(err);
    process.exit(1);
});
