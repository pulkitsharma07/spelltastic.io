import { z } from "zod";

export const Correction = z.object({
  issue_type: z.enum(["spelling", "grammar", "style", "consistency"]),
  original_text: z.string(),
  corrected_text: z.string(),
  surrounding_text: z.string(),
  explanation_for_correction: z.string(),
  probability_of_correctness: z.number(),
  severity: z.enum(["critical", "important", "minor"]),
});

export const CorrectionsResponse = z.object({
  corrections: z.array(Correction),
});

export type SpellCheckRunWithCorrectionCounts = {
  id: number;
  uuid: string;
  url: string;
  state: string;
  state_internal: string | null;
  run_start_time: Date;
  run_end_time: Date | null;
  created_by: string;
  critical_corrections_count: number;
  important_corrections_count: number;
  minor_corrections_count: number;
};
