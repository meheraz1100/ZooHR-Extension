
export type DynamicRow = Record<string, string> & {
  __sourceRow: string;
};

export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "empty";

export type ColumnInfo = {
  name: string;
  type: ColumnType;
  uniqueValues: string[];
  totalValues: number;
  emptyValues: number;
};

function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter(value => value.trim() !== "");

  if (!nonEmpty.length) return "empty";

  const isBoolean = nonEmpty.every(value =>
    ["true", "false", "yes", "no"].includes(
      value.trim().toLowerCase()
    )
  );

  if (isBoolean) return "boolean";

  const isNumber = nonEmpty.every(value => {
    const normalized = value.replace(/,/g, "").trim();

    return normalized !== "" && Number.isFinite(Number(normalized));
  });

  if (isNumber) return "number";

  const isDate = nonEmpty.every(value => {
    const normalized = value.trim();

    const datePattern =
      /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;

    const alternativeDatePattern =
      /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;

    return (
      datePattern.test(normalized) ||
      alternativeDatePattern.test(normalized)
    );
  });

  if (isDate) return "date";

  return "text";
}

function createUniqueHeaders(values: unknown[]): string[] {
  const used = new Map<string, number>();

  return values.map((value, index) => {
    const original = String(value ?? "").trim();
    const baseName = original || `Column ${index + 1}`;

    const count = used.get(baseName) ?? 0;
    used.set(baseName, count + 1);

    return count === 0
      ? baseName
      : `${baseName} (${count + 1})`;
  });
}

export function normalizeRows(values: unknown[][]) {
  if (!values.length) {
    return {
      headers: [] as string[],
      rows: [] as DynamicRow[],
      columns: [] as ColumnInfo[],
      issues: [] as string[]
    };
  }

  // Automatically extract every header from the first row.
  const headers = createUniqueHeaders(values[0]);

  // Automatically extract every row and column.
  const rows: DynamicRow[] = values.slice(1).map((row, index) => {
    const record: Record<string, string> = {};

    headers.forEach((header, columnIndex) => {
      const value = row[columnIndex];

      record[header] =
        value === null || value === undefined
          ? ""
          : String(value).trim();
    });

    return {
      ...record,
      __sourceRow: String(index + 2)
    };
  });

  // Automatically analyze every column.
  const columns: ColumnInfo[] = headers.map(header => {
    const columnValues = rows.map(row => row[header]);

    const nonEmpty = columnValues.filter(
      value => value.trim() !== ""
    );

    return {
      name: header,
      type: detectColumnType(columnValues),
      uniqueValues: [...new Set(nonEmpty)],
      totalValues: columnValues.length,
      emptyValues: columnValues.length - nonEmpty.length
    };
  });

  const issues: string[] = [];

  // Report completely empty rows without enforcing HR fields.
  rows.forEach((row, index) => {
    const hasData = headers.some(
      header => row[header].trim() !== ""
    );

    if (!hasData) {
      issues.push(`Row ${index + 2}: Empty row detected.`);
    }
  });

  return {
    headers,
    rows,
    columns,
    issues
  };
}
