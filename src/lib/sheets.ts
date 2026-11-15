
export type SheetTab = {
  title: string;
  sheetId: number;
  index: number;
  rowCount?: number;
  columnCount?: number;
};

export type SpreadsheetMetadata = {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: {
    properties: SheetTab;
  }[];
};

export type SheetValues = {
  range: string;
  majorDimension?: "ROWS" | "COLUMNS";
  values?: unknown[][];
};

export type ValueRenderOption =
  | "FORMATTED_VALUE"
  | "UNFORMATTED_VALUE"
  | "FORMULA";

export function parseSpreadsheetId(input: string): string {
  const trimmed = input.trim();

  const match = trimmed.match(
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );

  const id = match?.[1] ?? trimmed;

  if (!/^[a-zA-Z0-9_-]{15,}$/.test(id)) {
    throw new Error(
      "একটি valid Google Sheets URL অথবা Spreadsheet ID দিন।"
    );
  }

  return id;
}

export async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive: true },
      token => {
        const error = chrome.runtime.lastError;

        if (error || !token) {
          reject(
            new Error(
              error?.message ?? "Google authentication failed."
            )
          );
          return;
        }

        resolve(token);
      }
    );
  });
}

async function sheetsFetch<T>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/${path}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    throw new Error(
      body?.error?.message ??
      `Google Sheets API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Get spreadsheet information and all available worksheets.
 */
export async function getSpreadsheetMetadata(
  id: string,
  token: string
): Promise<SpreadsheetMetadata> {
  return sheetsFetch<SpreadsheetMetadata>(
    `spreadsheets/${encodeURIComponent(id)}` +
    `?fields=spreadsheetId,properties.title,sheets.properties`,
    token
  );
}

/**
 * Get values from any selected range.
 *
 * Examples:
 * Sheet1
 * Sheet1!A:Z
 * Sheet1!A1:Z500
 * 'Employee Database'!A:Z
 */
export async function getRangeValues(
  id: string,
  range: string,
  token: string,
  renderOption: ValueRenderOption = "UNFORMATTED_VALUE"
): Promise<SheetValues> {
  const cleanRange = range.trim();

  if (!cleanRange) {
    throw new Error("একটি valid Sheet Range দিন।");
  }

  const encodedRange = encodeURIComponent(cleanRange);

  const params = new URLSearchParams({
    valueRenderOption: renderOption,
    majorDimension: "ROWS"
  });

  return sheetsFetch<SheetValues>(
    `spreadsheets/${encodeURIComponent(id)}` +
    `/values/${encodedRange}?${params.toString()}`,
    token
  );
}

/**
 * Get the entire selected worksheet's used range.
 *
 * Google Sheets API returns only cells containing values.
 */
export async function getEntireSheetValues(
  id: string,
  sheetTitle: string,
  token: string,
  renderOption: ValueRenderOption = "UNFORMATTED_VALUE"
): Promise<SheetValues> {
  const safeTitle = `'${sheetTitle.replace(/'/g, "''")}'`;

  return getRangeValues(
    id,
    `${safeTitle}`,
    token,
    renderOption
  );
}
