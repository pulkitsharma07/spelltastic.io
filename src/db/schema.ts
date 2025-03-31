import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";

export const pageScanReportTable = sqliteTable(
  "page_scan_report",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull(),
    url: text("url").notNull(),
    run_start_time: integer("run_start_time", { mode: "timestamp" }).notNull(),
    run_end_time: integer("run_end_time", { mode: "timestamp" }),
    state: text("state").notNull(),
    state_internal: text("state_internal"),
    debugging_info: text("debugging_info", { mode: "json" }),
  },
  (table) => ({
    uuid_idx: index("page_scan_report_uuid_idx").on(table.uuid),
  }),
);

export const pageScanReportRelations = relations(
  pageScanReportTable,
  ({ many }) => ({
    pageScanReportCorrections: many(pageScanReportCorrectionsTable),
  }),
);

export const pageScanReportCorrectionsTable = sqliteTable(
  "page_scan_report_corrections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull(),
    page_scan_report_id: integer("page_scan_report_id")
      .notNull()
      .references(() => pageScanReportTable.id, { onDelete: "cascade" }),
    issue_type: text("issue_type").notNull(),
    original_text: text("original_text").notNull(),
    corrected_text: text("corrected_text").notNull(),
    surrounding_text: text("surrounding_text").notNull(),
    explanation_for_correction: text("explanation_for_correction").notNull(),
    probability_of_correctness: integer("probability_of_correctness").notNull(),
    severity: text("severity").notNull(),
    created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    uuid_idx: index("page_scan_report_corrections_uuid_idx").on(table.uuid),
    page_scan_report_idx: index(
      "page_scan_report_corrections_page_scan_report_idx",
    ).on(table.page_scan_report_id),
  }),
);

export const pageScanReportCorrectionsRelations = relations(
  pageScanReportCorrectionsTable,
  ({ one }) => ({
    pageScanReport: one(pageScanReportTable, {
      fields: [pageScanReportCorrectionsTable.page_scan_report_id],
      references: [pageScanReportTable.id],
    }),
  }),
);

export type PageScanReport = InferSelectModel<typeof pageScanReportTable>;
export type PageScanReportCorrection = InferSelectModel<
  typeof pageScanReportCorrectionsTable
>;
export type PageScanReportCorrectionToInsert = InferInsertModel<
  typeof pageScanReportCorrectionsTable
>;

export type PageScanReportWithCorrections = InferSelectModel<
  typeof pageScanReportTable
> & {
  pageScanReportCorrections: InferSelectModel<
    typeof pageScanReportCorrectionsTable
  >[];
};
