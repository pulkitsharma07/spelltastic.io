import { openai } from "@/openai";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";
import { CorrectionsResponse } from "@/types/corrections";
import { zodResponseFormat } from "openai/helpers/zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export type ModelProvider = "openai" | "google";
export type ModelName = "gpt-4o" | "gemini-2.0-flash";

export interface ModelResponse {
  llmResponse: z.infer<typeof CorrectionsResponse>;
  input_tokens: number;
  output_tokens: number;
}

const SYSTEM_PROMPT = `You are a helpful assistant that checks for text issues and suggests corrections on online websites. Classify issues by the following severities:
- critical: Major errors that significantly impact readability (e.g., spelling mistakes, severe grammar errors, typos, repeated words)
- important: Issues that should be fixed but don't completely break readability (e.g., awkward phrasing, consistency issues, missing words, grammar mistakes)
- minor: Subtle improvements that would enhance readability (e.g., style suggestions, minor clarity improvements)

Important: Keep the issues concise and to the point.

DO NOT CHECK for the following things:
* Do not check for code, urls, variables, domain names
* Do not check for smart quotes, emojis, or other non-printable characters.
* Do not check for formal tones or formality.
* DO not check for American vs British english consistency issues.
* DO NOT check for ellipses.
* DO NOT check for capitalization.`;

export async function getModelResponse(
  pageURL: string,
  extractedText: string,
  severities: string[],
  model: ModelName = "gpt-4o",
): Promise<ModelResponse> {
  if (model === "gpt-4o") {
    return getOpenAIResponse(pageURL, extractedText, severities, model);
  } else {
    return getGoogleResponse(pageURL, extractedText, severities, model);
  }
}

async function getOpenAIResponse(
  pageURL: string,
  extractedText: string,
  severities: string[],
  model: ModelName,
): Promise<ModelResponse> {
  const prompt =
    "Following text is from the website: " +
    pageURL +
    " \n Please check it and return the corrections: ``` \n " +
    extractedText +
    " \n ``` Return only " +
    severities.join(", ") +
    " severity corrections.";

  if (process.env.NODE_ENV != "production") {
    console.log("Prompt for getOpenAIResponse: ", prompt);
  }

  const completion = await openai.beta.chat.completions.parse({
    model: model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: zodResponseFormat(CorrectionsResponse, "corrections"),
  });

  const content = completion.choices[0]?.message?.parsed;
  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  return {
    llmResponse: content,
    input_tokens: completion.usage?.prompt_tokens || 0,
    output_tokens: completion.usage?.completion_tokens || 0,
  };
}

async function getGoogleResponse(
  pageURL: string,
  extractedText: string,
  severities: string[],
  model: ModelName,
): Promise<ModelResponse> {
  const schema = {
    description: "List of corrections",
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        issue_type: {
          type: SchemaType.STRING,
          description: "Type of the issue",
          nullable: false,
        },
        original_text: {
          type: SchemaType.STRING,
          description: "Original text, verbatim",
          nullable: false,
        },
        corrected_text: {
          type: SchemaType.STRING,
          description: "Corrected text to replace the original text",
          nullable: false,
        },
        surrounding_text: {
          type: SchemaType.STRING,
          description:
            "Surrounding text containing the original text, limit to 100 characters",
          nullable: false,
        },
        explanation_for_correction: {
          type: SchemaType.STRING,
          description: "Explanation for the correction",
          nullable: false,
        },
        probability_of_correctness: {
          type: SchemaType.NUMBER,
          description: "Probability of correctness, between 0.0 and 1.0",
          nullable: false,
        },
        severity: {
          type: SchemaType.STRING,
          description: "Severity of the issue: critical, important, minor",
          nullable: false,
        },
      },
      required: [
        "issue_type",
        "original_text",
        "corrected_text",
        "surrounding_text",
        "explanation_for_correction",
        "probability_of_correctness",
        "severity",
      ],
    },
  };

  const geminiModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await geminiModel.generateContent(
    "The following text is from the website: " +
      pageURL +
      " \n Please check it and return the corrections: ``` \n " +
      extractedText,
  );

  const jsonResponse = JSON.parse(result.response.text());
  const llmResponse = {
    corrections: jsonResponse,
  };

  return {
    llmResponse: llmResponse,
    input_tokens: 0,
    output_tokens: 0,
  };
}
