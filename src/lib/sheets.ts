export type SheetTab = { title: string; sheetId: number; index: number };
export type SpreadsheetMetadata = { spreadsheetId: string; properties: { title: string }; sheets: { properties: SheetTab }[] };

export function parseSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = match?.[1] ?? trimmed;
  if (!/^[a-zA-Z0-9-_]{15,}$/.test(id)) {
    throw new Error("একটি valid Google Sheets URL অথবা Spreadsheet ID দিন।");
  }
  return id;
}

export async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      const error = chrome.runtime.lastError;
      if (error || !token) reject(new Error(error?.message ?? "Google authentication failed."));
      else resolve(token);
    });
  });
}

async function sheetsFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Google Sheets API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getSpreadsheetMetadata(id: string, token: string) {
  return sheetsFetch<SpreadsheetMetadata>(
    `spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,properties.title,sheets.properties`,
    token
  );
}

export async function getRangeValues(id: string, range: string, token: string) {
  const encodedRange = encodeURIComponent(range);
  return sheetsFetch<{ range: string; values?: string[][] }>(
    `spreadsheets/${encodeURIComponent(id)}/values/${encodedRange}?valueRenderOption=UNFORMATTED_VALUE`,
    token
  );
}
