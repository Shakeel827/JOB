import * as XLSX from "xlsx";

export const BULK_JOB_HEADERS = [
  "Title",
  "Company",
  "Location",
  "Salary",
  "Type",
  "Job Type",
  "External Link",
  "Description",
  "Skills",
] as const;

export type BulkJobRow = Record<(typeof BULK_JOB_HEADERS)[number], string>;

const HEADER_ROW = [...BULK_JOB_HEADERS];

/** Generate and download Excel template for bulk job upload */
export function downloadJobTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADER_ROW,
    [
      "Senior React Developer",
      "TechCorp",
      "Bangalore",
      "₹18-25 LPA",
      "Full-time",
      "internal",
      "",
      "We are looking for a Senior React Developer...",
      "React, TypeScript, Node.js",
    ],
    [
      "Product Designer",
      "DesignLab",
      "Mumbai",
      "₹12-18 LPA",
      "Remote",
      "external",
      "https://example.com/apply",
      "Join our design team.",
      "Figma, UI/UX",
    ],
  ]);
  ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 40 }, { wch: 25 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jobs");
  XLSX.writeFile(wb, "jobverse_jobs_template.xlsx");
}

/** Parse .xlsx file and return array of job rows; validates headers */
export function parseJobExcel(file: File): Promise<{ rows: BulkJobRow[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const errors: string[] = [];
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ rows: [], errors: ["Could not read file."] });
          return;
        }
        const wb = XLSX.read(data, { type: "binary" });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          resolve({ rows: [], errors: ["No sheet found."] });
          return;
        }
        const ws = wb.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: "" });
        if (!Array.isArray(json) || json.length < 2) {
          resolve({ rows: [], errors: ["File must have a header row and at least one data row."] });
          return;
        }
        const rawHeaders = (json[0] as unknown as string[]).map((h) => String(h ?? "").trim());
        const colIndex = (key: string): number =>
          rawHeaders.findIndex((h) => String(h).toLowerCase() === key.toLowerCase());
        const titleIdx = colIndex("Title");
        const companyIdx = colIndex("Company");
        if (titleIdx < 0 || companyIdx < 0) {
          resolve({ rows: [], errors: ["Sheet must have 'Title' and 'Company' columns."] });
          return;
        }
        const getVal = (row: string[], key: string) => {
          const idx = colIndex(key);
          return idx >= 0 ? String(row[idx] ?? "").trim() : "";
        };
        const rows: BulkJobRow[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as unknown as string[];
          if (!Array.isArray(row)) continue;
          const title = getVal(row, "Title");
          const company = getVal(row, "Company");
          if (!title && !company) continue;
          rows.push({
            Title: title,
            Company: company,
            Location: getVal(row, "Location"),
            Salary: getVal(row, "Salary"),
            Type: getVal(row, "Type") || "Full-time",
            "Job Type": getVal(row, "Job Type") || "internal",
            "External Link": getVal(row, "External Link"),
            Description: getVal(row, "Description"),
            Skills: getVal(row, "Skills"),
          });
        }
        if (rows.length === 0) {
          errors.push("No valid job rows found.");
        }
        resolve({ rows, errors });
      } catch (err) {
        resolve({ rows: [], errors: [err instanceof Error ? err.message : "Parse error."] });
      }
    };
    reader.readAsBinaryString(file);
  });
}

/** Detect duplicate rows by Title + Company */
export function findDuplicateRows(rows: BulkJobRow[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  rows.forEach((row, i) => {
    const key = `${(row.Title || "").toLowerCase()}|${(row.Company || "").toLowerCase()}`;
    if (!key.replace(/\|$/, "")) return;
    if (seen.has(key)) {
      duplicates.add(seen.get(key)!);
      duplicates.add(i);
    } else seen.set(key, i);
  });
  return duplicates;
}
