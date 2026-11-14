export type Mapping = Record<string, string>;
const aliases: Record<string, string[]> = {
  employee_name: ["name", "full name", "employee name", "staff name"],
  employee_id: ["employee id", "staff id", "id", "emp id"],
  email: ["email", "e-mail", "email address", "work email"],
  department: ["department", "dept", "dept."],
  designation: ["designation", "job title", "position", "role"],
  joining_date: ["joining date", "date joined", "start date"],
  status: ["status", "employment status"]
};

export function suggestMappings(headers: string[]): Mapping {
  const result: Mapping = {};
  for (const header of headers) {
    const normalized = header.trim().toLowerCase().replace(/[_-]/g, " ");
    const match = Object.entries(aliases).find(([, names]) => names.includes(normalized));
    if (match) result[header] = match[0];
  }
  return result;
}
