import OpenAI from "openai";

const baseURL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
const apiKey = process.env.LITELLM_API_KEY ?? "not-required";

if (!baseURL) {
  throw new Error("Missing LiteLLM base URL.");
}

const globalForOpenAI = globalThis as unknown as {
  openAIClient?: OpenAI;
};

export const openAIClient =
  globalForOpenAI.openAIClient ??
  new OpenAI({
    apiKey,
    baseURL
  });

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openAIClient = openAIClient;
}
