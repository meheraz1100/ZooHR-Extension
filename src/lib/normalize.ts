import { z } from "zod";

export const employeeSchema = z.object({
  employee_id: z.string().optional(),
  employee_name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  department: z.string().optional(),
  designation: z.string().optional(),
  joining_date: z.string().optional(),
  status: z.string().optional()
});

export function normalizeRows(values: unknown[][], mapping: Record<string, string>) {
  if (!values.length) return { rows: [], headers: [], issues: [] as string[] };
  const headers = values[0].map(v => String(v ?? "").trim());
  const rows = values.slice(1).map((row, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      const target = mapping[header];
      if (target) record[target] = String(row[columnIndex] ?? "").trim();
    });
    return { ...record, __sourceRow: String(index + 2) };
  });
  const issues: string[] = [];
  rows.forEach((row, index) => {
    if (!row.employee_name) issues.push(`Row ${index + 2}: employee name is missing.`);
  });
  return { rows, headers, issues };
}
