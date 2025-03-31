import puppeteer, { Browser, Page } from "puppeteer";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { CorrectionsResponse as CorrectionsLLMResponse } from "@/types/corrections";
import { db } from "@/db";
import {
  PageScanReport,
  pageScanReportCorrectionsTable,
  PageScanReportCorrection,
  PageScanReportCorrectionToInsert,
  pageScanReportTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { Logger, pino } from "pino";
import { redis } from "@/redis";
import { COST_PER_INPUT_TOKEN, COST_PER_OUTPUT_TOKEN } from "@/constants";
import { openai } from "@/openai";
import { sendAlert } from "@/lib/alert";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { getModelResponse, ModelName } from "@/lib/model-providers";

const root_logger = pino({
  name: "create-run",
});

export type WorkflowResponse = {
  pageScanReport: PageScanReport;
  pageScanReportCorrections: PageScanReportCorrection[];
  input_tokens: number;
  output_tokens: number;
};

async function getCacheKeyForSpellCheck(
  website: string,
  extractedText: string,
  severities: string[],
  model: ModelName,
) {
  // md5sum of extractedText
  const md5sum = createHash("md5").update(extractedText).digest("hex");
  return `spell_check:${website}_${severities.join(",")}_${model}_${md5sum}`;
}

async function checkSpellingViaAI(
  pageURL: string,
  extractedText: string,
  severities: string[],
  model: ModelName,
): Promise<{
  llmResponse: z.infer<typeof CorrectionsLLMResponse>;
  input_tokens: number;
  output_tokens: number;
}> {
  const cacheKey = await getCacheKeyForSpellCheck(
    pageURL,
    extractedText,
    severities,
    model,
  );

  // Try to get from cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return {
      llmResponse: JSON.parse(cached) as z.infer<typeof CorrectionsLLMResponse>,
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const result = await getModelResponse(
    pageURL,
    extractedText,
    severities,
    model,
  );

  try {
    // Cache the result for 3 days
    await redis.set(cacheKey, JSON.stringify(result.llmResponse), {
      EX: 60 * 60 * 24 * 3, // 3 days in seconds
    });

    return result;
  } catch {
    throw new Error("Failed to parse corrections from model provider");
  }
}

async function startPuppeteer(
  url: string,
  logger: Logger,
): Promise<{ page: Page; browser: Browser }> {
  let page: Page | null = null;
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    page = await browser.newPage();
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36";
    await page.setViewport({ width: 1920, height: 1080 * 20 });
    await page.setUserAgent(ua);
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.setBypassCSP(true);

    await page.evaluate(() => {
      // Create a trusted types policy, this is required to inject the spelltastic-highlight class
      // @ts-expect-error - Browser-specific function
      const policy = window.trustedTypes.createPolicy("trusted-html", {
        createHTML: (input) => input,
      });

      // Store original innerHTML descriptor
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        Element.prototype,
        "innerHTML",
      );

      // Override innerHTML to handle string operations safely
      Object.defineProperty(Element.prototype, "innerHTML", {
        get() {
          // Get the raw HTML content
          // @ts-expect-error - Browser-specific function
          return originalDescriptor.get.call(this);
        },
        set(html) {
          // Create trusted HTML and set it
          const trustedHtml = policy.createHTML(html);
          // @ts-expect-error - Browser-specific function
          originalDescriptor.set.call(this, trustedHtml);
        },
        configurable: true,
      });

      // Add safe wrapper methods for string operations
      // @ts-expect-error - Browser-specific function
      Element.prototype.safeIncludes = function (searchString) {
        const content = this.innerHTML;
        return typeof content === "string" && content.includes(searchString);
      };

      // @ts-expect-error - Browser-specific function
      Element.prototype.safeReplace = function (searchValue, replaceValue) {
        const content = this.innerHTML;
        if (typeof content === "string") {
          const newContent = content.replace(searchValue, replaceValue);
          this.innerHTML = newContent; // This will use our trusted policy
          return newContent;
        }
        return content;
      };
    });

    return { page, browser };
  } catch (error) {
    try {
      if (page) {
        await page.close();
      }

      if (browser) {
        await browser.close();
      }
    } catch (error) {
      logger.error("Error while closing puppeteer browser (somehow) " + error);
    }

    throw new Error("Error starting puppeteer " + error);
  }
}

async function extractAllText(page: Page): Promise<{ text: string }> {
  // Injects JS code to define two methods on the global window object
  // findLowestElementWithText: Finds the lowest element in the DOM which contains the given text
  // underlineTextWithPopup: Underlines the text with the given severity
  let text = await page.evaluate(() => {
    // @ts-expect-error - Browser-specific function
    function findLowestElementWithText(root, searchText) {
      const result = {
        element_ref: null,
        coordinates: null,
      };

      // @ts-expect-error - Browser-specific function
      function traverse(node) {
        // Check if the node is an element node
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the text is found in the node's innerText
          if (node.innerText && node.innerText.includes(searchText)) {
            const rect = node.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > 0) {
              result.element_ref = node; // Update the result with the current node
              // @ts-expect-error - Browser-specific function
              result.coordinates = {
                x: Math.round(rect.x + window.scrollX),
                y: Math.round(rect.y + window.scrollY),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              };
            }

            // Traverse the children of the current node
            for (const child of node.children) {
              traverse(child); // Recursively check each child
            }
          }
        }
      }

      traverse(root);
      return result;
    }
    // @ts-expect-error - Browser-specific function
    window.__SPELLTASTIC_findLowestElementWithText = findLowestElementWithText;

    // @ts-expect-error - Browser-specific function
    function underlineTextWithPopup(searchText, severity) {
      // @ts-expect-error - Browser-specific function
      const targetNode = window.__SPELLTASTIC_findLowestElementWithText(
        document.body,
        searchText,
      );

      const node = targetNode.element_ref;
      const coordinates = targetNode.coordinates;

      if (!node || !searchText) {
        return false;
      }

      // replace & with &amp;
      // when using node.innerHTML, & will be encoded as &amp;
      searchText = searchText.replace(/&/g, "&amp;");

      // Create a regular expression to find the text, escaping special regex characters
      const regex = new RegExp(
        `(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
      );

      const severityStyles = {
        critical: {
          color: "rgba(220,38,38,1)", // red-600
          bg: "rgba(220,38,38,0.2)",
        },
        important: {
          color: "rgba(217,119,6,1)", // amber-600
          bg: "rgba(217,119,6,0.2)",
        },
        minor: {
          color: "rgba(37,99,235,1)", // blue-600
          bg: "rgba(37,99,235,0.2)",
        },
      };

      // @ts-expect-error - Browser-specific function
      const style = severityStyles[severity] || severityStyles.minor;

      // Replace the text with a span wrapping the matched text
      const newHTML = node.innerHTML.replace(
        regex,
        `<span style="position: relative; display: inline-block;">
            <span class="spelltastic-highlight" style="
                text-decoration-line: underline;
                text-decoration-style: solid;
                text-decoration-color: ${style.color};
                text-decoration-thickness: 3px;
                background-color: ${style.bg};
            ">$1</span>
        </span>`,
      );
      // Apply the new HTML to the node
      node.innerHTML = newHTML;
      return {
        success: node.innerHTML.includes("spelltastic-highlight"),
        coordinates: coordinates,
      };
    }

    // @ts-expect-error - Browser-specific function
    window.__SPELLTASTIC_underlineTextWithPopup = underlineTextWithPopup;

    return document.body.innerText
      .normalize("NFKC")
      .replace(
        /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g,
        " ",
      )
      .replace(/\s+/g, " ");
  });

  if (text.length > 10000) {
    root_logger.warn(
      "Text content is very long, truncating to first 10000 characters",
    );
    text = text.substring(0, 10000);
  }

  return { text };
}

async function truePositives(
  llmResponse: z.infer<typeof CorrectionsLLMResponse>,
  text: string,
): Promise<z.infer<typeof CorrectionsLLMResponse>> {
  const probabilityThreshold = 0.8;
  const highProbabilityCorrections = llmResponse.corrections.filter(
    (correction) =>
      correction.probability_of_correctness >= probabilityThreshold &&
      correction.corrected_text !== correction.original_text,
  );

  // ignore corrections that are too long
  const maxLength = 200;
  const shortCorrections = highProbabilityCorrections.filter(
    (correction) =>
      correction.corrected_text.length <= maxLength &&
      correction.surrounding_text.length <= maxLength * 1.5,
  );

  const truePositives = shortCorrections.filter((correction) =>
    text.includes(correction.surrounding_text),
  );

  // Remove duplicates
  const originalTextSet = new Set();
  const uniqueTruePositives = truePositives.filter((correction) => {
    if (originalTextSet.has(correction.original_text)) {
      return false;
    }
    originalTextSet.add(correction.original_text);
    return true;
  });

  return { corrections: uniqueTruePositives };
}

async function validateCorrections(
  corrections: z.infer<typeof CorrectionsLLMResponse>,
): Promise<{
  validCorrections: z.infer<typeof CorrectionsLLMResponse>;
  input_tokens: number;
  output_tokens: number;
}> {
  const cacheKey = `validate:${corrections.corrections
    .map((c) => c.corrected_text)
    .join(",")}`;

  // Try to get from cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return {
      validCorrections: JSON.parse(cached) as z.infer<
        typeof CorrectionsLLMResponse
      >,
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const validator_model = "gpt-4o";
  const validator_prompt =
    "You are a helpful assistant that validates the corrections provided below. You check if the corrections are correct and if they are relevant to the text. You return the corrections that are correct and relevant to the text. You return the corrections in the same format as the original corrections.";
  const user_prompt = JSON.stringify({
    corrections: corrections.corrections.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ probability_of_correctness, ...rest }) => rest,
    ),
  });

  const validator_response = await openai.beta.chat.completions.parse({
    model: validator_model,
    temperature: 0.4,
    messages: [
      { role: "system", content: validator_prompt },
      { role: "user", content: user_prompt },
    ],
    response_format: zodResponseFormat(CorrectionsLLMResponse, "corrections"),
  });

  const content = validator_response.choices[0]?.message?.parsed;
  if (!content) {
    throw new Error("Failed to parse corrections from OpenAI (Validator)");
  }

  try {
    const result = CorrectionsLLMResponse.parse(content);

    // Cache the result for 3 days
    await redis.set(cacheKey, JSON.stringify(result), {
      EX: 60 * 60 * 24 * 3, // 3 days in seconds
    });

    return {
      validCorrections: result,
      input_tokens: validator_response.usage?.prompt_tokens || 0,
      output_tokens: validator_response.usage?.completion_tokens || 0,
    };
  } catch {
    throw new Error("Failed to parse corrections from OpenAI (Validator)");
  }
}

async function injectCorrectionIndicatorsIntoWebpage(
  dbCorrections: PageScanReportCorrectionToInsert[],
  puppeteerPage: Page,
  logger: Logger,
): Promise<PageScanReportCorrectionToInsert[]> {
  const successfulCorrections: PageScanReportCorrectionToInsert[] = [];

  for (const correction of dbCorrections) {
    const { success, coordinates } = await puppeteerPage.evaluate(
      ({ originalText, severity }) => {
        // @ts-expect-error - Browser-specific function
        return window.__SPELLTASTIC_underlineTextWithPopup(
          originalText,
          severity,
        );
      },
      {
        originalText: correction.original_text,
        severity: correction.severity,
      },
    );

    if (success) {
      await takeScreenshotOfCorrection(
        correction,
        puppeteerPage,
        coordinates,
        100,
      );
      successfulCorrections.push(correction);
    } else {
      logger.warn(
        "Failed to inject correction on UI, discarding it:",
        correction,
      );
    }
  }

  return successfulCorrections;
}

// Doesn't actually create the corrections in the DB, just returns the corrections to be injected
async function prepareDBCorrections(
  corrections: z.infer<typeof CorrectionsLLMResponse>,
  pageScanReport: PageScanReport,
): Promise<PageScanReportCorrectionToInsert[]> {
  const correctionsToInsert = corrections.corrections.map((correction) => ({
    uuid: uuidv4(),
    page_scan_report_id: pageScanReport.id,
    issue_type: correction.issue_type,
    original_text: correction.original_text,
    corrected_text: correction.corrected_text,
    surrounding_text: correction.surrounding_text,
    explanation_for_correction: correction.explanation_for_correction,
    probability_of_correctness: correction.probability_of_correctness,
    severity: correction.severity,
    created_at: new Date(),
  }));

  return correctionsToInsert;
}
async function takeScreenshotOfCorrection(
  correction: PageScanReportCorrectionToInsert,
  puppeteerPage: Page,
  coordinates: { x: number; y: number; width: number; height: number },
  padding: number,
): Promise<void> {
  const screenshot = await puppeteerPage.screenshot({
    clip: {
      x: Math.max(0, coordinates.x - padding),
      y: Math.max(0, coordinates.y - padding),
      width: coordinates.width + padding * 2,
      height: coordinates.height + padding * 2,
    },
  });

  // Generate unique filename based on correction details
  const filename = `${correction.uuid}.png`;
  const filepath = path.join("local_user_data", "screenshots", filename);
  // Write screenshot to disk
  await fs.promises.writeFile(filepath, screenshot);
}

async function workFlow(
  pageURL: string,
  severities: string[],
  puppeteerPage: Page,
  pageScanReport: PageScanReport,
  logger: Logger,
  pushEventToFrontend: (
    key: "running" | "completed" | "error",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
  ) => void,
  model: ModelName,
): Promise<WorkflowResponse> {
  pushEventToFrontend("running", "Extracting text from the page...");
  await db
    .update(pageScanReportTable)
    .set({ state_internal: "extracting_text" })
    .where(eq(pageScanReportTable.id, pageScanReport.id));
  const { text: extractedText } = await extractAllText(puppeteerPage);

  logger.info("Step 2: Validating text length");
  await db
    .update(pageScanReportTable)
    .set({ state_internal: "validating_text" })
    .where(eq(pageScanReportTable.id, pageScanReport.id));
  if (extractedText.length === 0) {
    throw new Error("Not enough text content found on the page");
  }
  if (extractedText.length < 10) {
    throw new Error("Not enough text content found on the page");
  }

  // Step 3: LLM Check
  pushEventToFrontend(
    "running",
    "Checking for typos, grammatical errors, and other issues...",
  );
  await db
    .update(pageScanReportTable)
    .set({ state_internal: "checking_spelling" })
    .where(eq(pageScanReportTable.id, pageScanReport.id));

  const { llmResponse, input_tokens, output_tokens } = await checkSpellingViaAI(
    pageURL,
    extractedText,
    severities,
    model,
  );

  if (!llmResponse) {
    throw new Error("Failed to check spelling via LLM, empty response");
  }

  // No corrections found - update state and return early
  if (llmResponse.corrections.length === 0) {
    logger.info("No corrections found, completing run");
    return {
      pageScanReport: pageScanReport,
      pageScanReportCorrections: [],
      input_tokens: input_tokens,
      output_tokens: output_tokens,
    };
  }

  // Step 4-6: Filtering and Validation
  await db
    .update(pageScanReportTable)
    .set({ state_internal: "filtering_corrections" })
    .where(eq(pageScanReportTable.id, pageScanReport.id));
  const truePositivesStage1 = await truePositives(llmResponse, extractedText);
  if (truePositivesStage1.corrections.length === 0) {
    logger.info("No true positives found", llmResponse);
    return {
      pageScanReport: pageScanReport,
      pageScanReportCorrections: [],
      input_tokens: input_tokens,
      output_tokens: output_tokens,
    };
  }

  pushEventToFrontend("running", "Generating suggestions...");
  const {
    validCorrections,
    input_tokens: input_tokens_validation,
    output_tokens: output_tokens_validation,
  } = await validateCorrections(truePositivesStage1);
  if (!validCorrections || validCorrections.corrections.length === 0) {
    logger.info(
      "No valid corrections found after LLM validation",
      truePositivesStage1,
    );
    return {
      pageScanReport: pageScanReport,
      pageScanReportCorrections: [],
      input_tokens: input_tokens + input_tokens_validation,
      output_tokens: output_tokens + output_tokens_validation,
    };
  }

  const totalInputTokens = input_tokens + input_tokens_validation;
  const totalOutputTokens = output_tokens + output_tokens_validation;

  console.log(
    "validCorrections input for second filter ----- ",
    JSON.stringify(validCorrections, null, 2),
  );
  const truePositivesStage2 = await truePositives(
    validCorrections,
    extractedText,
  );
  if (truePositivesStage2.corrections.length === 0) {
    logger.info(
      "No valid corrections found after second filter",
      validCorrections,
    );
    return {
      pageScanReport: pageScanReport,
      pageScanReportCorrections: [],
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    };
  }

  // Step 7-8: Creating and Injecting Corrections
  pushEventToFrontend("running", "Removing false positives...");
  await db
    .update(pageScanReportTable)
    .set({ state_internal: "injecting_corrections" })
    .where(eq(pageScanReportTable.id, pageScanReport.id));
  const dbCorrections = await prepareDBCorrections(
    truePositivesStage2,
    pageScanReport,
  );

  if (dbCorrections.length === 0) {
    logger.info("No corrections were injected", truePositivesStage2);
    return {
      pageScanReport: pageScanReport,
      pageScanReportCorrections: [],
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    };
  }

  pushEventToFrontend("running", "Almost done...");
  const trueDBCorrections = await injectCorrectionIndicatorsIntoWebpage(
    dbCorrections,
    puppeteerPage,
    logger,
  );

  // store the corrections in the DB
  let finalDBCorrections: PageScanReportCorrection[] = [];
  if (trueDBCorrections.length > 0) {
    finalDBCorrections = await db
      .insert(pageScanReportCorrectionsTable)
      .values(trueDBCorrections)
      .returning();
  }

  // Final state update
  pushEventToFrontend("running", "Finishing up...");
  const [finalPageScanReport] = await db
    .update(pageScanReportTable)
    .set({
      state_internal: "completed",
      state: "completed",
      run_end_time: new Date(),
    })
    .where(eq(pageScanReportTable.id, pageScanReport.id))
    .returning();

  return {
    pageScanReportCorrections: finalDBCorrections,
    pageScanReport: finalPageScanReport,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
  };
}

async function startWorkFlow(
  url: string,
  severities: string[],
  pushEventToFrontend: (
    key: "running" | "completed" | "error",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
  ) => void,
  logger: Logger,
  uuid: string,
): Promise<void> {
  let page: Page | null = null;
  let browser: Browser | null = null;
  let newPageScanReport: PageScanReport | null = null;
  try {
    logger.info(`Starting workflow for ${url}`);
    pushEventToFrontend("running", "Opening the page...");
    // const model = "gemini-2.0-flash";
    const model = "gpt-4o";

    [newPageScanReport] = await db
      .insert(pageScanReportTable)
      .values({
        url: url,
        uuid: uuid,
        run_start_time: new Date(),
        state: "running",
        state_internal: "initializing",
        debugging_info: {
          generate_corrections_model: model,
          validator_model: "gpt-4o",
        },
      })
      .returning();

    logger.info(`Starting Puppeteer, opening the page`);
    const { page: newPage, browser: newBrowser } = await startPuppeteer(
      url,
      logger,
    );
    page = newPage;
    browser = newBrowser;

    const result = await workFlow(
      url,
      severities,
      page,
      newPageScanReport,
      logger,
      pushEventToFrontend,
      model,
    );
    // Calculate total tokens and cost
    const totalCost =
      result.input_tokens * COST_PER_INPUT_TOKEN +
      result.output_tokens * COST_PER_OUTPUT_TOKEN;

    const corrections = result.pageScanReportCorrections;

    logger.info(
      `Total cost: $${totalCost.toFixed(
        4,
      )}, number of corrections identified: ${corrections.length}`,
    );

    const criticalCorrections = corrections.filter(
      (correction) => correction.severity === "critical",
    );
    const importantCorrections = corrections.filter(
      (correction) => correction.severity === "important",
    );
    const minorCorrections = corrections.filter(
      (correction) => correction.severity === "minor",
    );

    pushEventToFrontend(
      "running",
      "Found " + criticalCorrections.length + " critical corrections",
    );
    pushEventToFrontend(
      "running",
      "Found " + importantCorrections.length + " important corrections",
    );
    pushEventToFrontend(
      "running",
      "Found " + minorCorrections.length + " minor corrections",
    );
    pushEventToFrontend("completed", newPageScanReport.uuid);

    if (corrections.length === 0) {
      logger.info(`No corrections found, updating the run to completed`);
      await db
        .update(pageScanReportTable)
        .set({
          state_internal: "completed",
          state: "completed",
          run_end_time: new Date(),
        })
        .where(eq(pageScanReportTable.id, newPageScanReport.id));
    }

    if (page) {
      await page.close();
    }

    if (browser) {
      await browser.close();
    }
  } catch (error) {
    sendAlert(
      `Error in run uuid: ${newPageScanReport?.uuid}, error: ${JSON.stringify(
        error,
      )}`,
      { level: "error" },
    );
    logger.error(
      `Error running workflow: ${String(error)} ${
        (error as Error)?.stack ?? ""
      }`,
    );

    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }

    try {
      if (newPageScanReport) {
        await db
          .update(pageScanReportTable)
          .set({
            state: "failed",
            state_internal: "failed - " + error,
            run_end_time: new Date(),
          })
          .where(eq(pageScanReportTable.id, newPageScanReport.id));
      }
    } catch (error) {
      logger.error(`Error updating spell check run: ${error}`);
    }

    pushEventToFrontend("error", "🚫 Unable to check the website: " + error);
  }
}

export async function POST(request: Request) {
  const { url, uuid } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!uuid) {
    return NextResponse.json({ error: "UUID is required" }, { status: 400 });
  }

  const logger = root_logger.child({
    uuid,
  });
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  sendAlert("Starting new run: " + url, {
    level: "info",
  });

  // Set up SSE headers
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  async function pushEventToFrontend(
    key: "running" | "completed" | "error",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
  ) {
    logger.info(`Sending frontend event: ${key} - ${data}`);
    writer.write(encoder.encode(`data: ${JSON.stringify({ key, data })}\n\n`));

    if (key === "error" || key === "completed") {
      writer.close();
    }
  }

  // This will run in the background and keep sending events to the frontend
  startWorkFlow(
    url,
    ["critical", "important", "minor"],
    pushEventToFrontend,
    logger,
    uuid,
  ).then(async () => {
    logger.info("Report generation successful");
  });

  // Clean up when client disconnects
  request.signal.addEventListener("abort", () => {
    writer.close();
  });

  return new Response(stream.readable, { headers });
}
