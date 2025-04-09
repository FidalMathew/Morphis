import { IAXAdapter } from "../src/iax";
import { OpenAI } from "langchain/llms/openai";

describe("IAXAdapter", () => {
  let adapter: IAXAdapter;

  beforeEach(() => {
    adapter = new IAXAdapter({
      model: new OpenAI({ temperature: 0 }),
    });
  });

  test("explain method returns explanation", async () => {
    const input = "Sample input text";
    const explanation = await adapter.explain(input);
    expect(explanation).toBeTruthy();
  });

  test("getFeatureImportance returns feature importance scores", async () => {
    const input = "Sample input text";
    const importance = await adapter.getFeatureImportance(input);
    expect(importance).toBeDefined();
  });

  test("getCounterfactuals returns alternative scenarios", async () => {
    const input = "Sample input text";
    const counterfactuals = await adapter.getCounterfactuals(input);
    expect(Array.isArray(counterfactuals)).toBe(true);
  });
});
