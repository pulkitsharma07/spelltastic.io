import { OpenAI } from "openai";

export const openai = (() => {
  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    throw new Error(`Failed to initialize OpenAI client: ${error}`);
  }
})();
