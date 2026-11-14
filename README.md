# ZooHR Chrome Extension — MVP Starter

A local-first Manifest V3 Chrome extension starter for extracting selected Google Sheets ranges and mapping columns into HR fields.

## Included
- React + TypeScript + Vite multi-page build (popup + workspace)
- Manifest V3 extension configuration
- Google Sheets URL/ID parser
- Chrome Identity OAuth integration scaffold
- Google Sheets metadata and values API services
- Worksheet and A1 range selection
- Header mapping suggestions
- Basic employee-row validation
- CSV export
- HR module navigation placeholders

## Requirements
- Node.js 20+ recommended
- Google Chrome
- A Google Cloud project with Google Sheets API enabled

## Setup

```bash
npm install
npm run build
```

The extension output is in `dist/`.

## Google OAuth configuration required

Before testing authentication:
1. Create a project in Google Cloud Console.
2. Enable Google Sheets API.
3. Configure the OAuth consent screen.
4. Create an OAuth client suitable for a Chrome Extension.
5. Add the generated extension ID to the OAuth client configuration.
6. Add the OAuth client ID to `public/manifest.json` under `oauth2.client_id`, and add the scope `https://www.googleapis.com/auth/spreadsheets.readonly`.
7. Rebuild and reload the extension.

Example manifest OAuth section:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/spreadsheets.readonly"]
}
```

For a stable development extension ID, use Chrome's unpacked extension key workflow and keep the same key for local builds. Never commit private keys or OAuth secrets to a public repository.

## Load in Chrome
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose the `dist` folder.

## Current limitations
- OAuth client ID must be configured by the developer.
- This starter currently maps the Employee schema only; Recruitment, KPI and Attendance screens are placeholders.
- CSV export is implemented; XLSX, JSON and PDF are next.
- Extraction currently reads the selected A1 range and previews its values.
- This is a starter, not a production-ready HR system. Test with dummy data first.
