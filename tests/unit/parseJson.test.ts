import { describe, it, expect } from "vitest";
import { parseJsonDefensively } from "../../src/utils/parseJson.js";

describe("parseJsonDefensively helper", () => {
  it("should parse standard clean JSON", () => {
    const raw = '{"a": 1, "b": "hello"}';
    const parsed = parseJsonDefensively<{ a: number; b: string }>(raw);
    expect(parsed.a).toBe(1);
    expect(parsed.b).toBe("hello");
  });

  it("should parse JSON wrapped in markdown blocks", () => {
    const raw = `
Some explanation before the JSON:
\`\`\`json
{
  "test": true,
  "list": [1, 2, 3]
}
\`\`\`
Follow-up conversational remarks.
`;
    const parsed = parseJsonDefensively<{ test: boolean; list: number[] }>(raw);
    expect(parsed.test).toBe(true);
    expect(parsed.list).toEqual([1, 2, 3]);
  });

  it("should parse JSON with raw triple backtick fences without the 'json' language identifier", () => {
    const raw = `
\`\`\`
{
  "ok": "yes"
}
\`\`\`
`;
    const parsed = parseJsonDefensively<{ ok: string }>(raw);
    expect(parsed.ok).toBe("yes");
  });

  it("should throw a clear error when parsing invalid input", () => {
    const raw = "not a json string at all";
    expect(() => parseJsonDefensively(raw)).toThrowError("Failed to parse LLM JSON output");
  });
});
