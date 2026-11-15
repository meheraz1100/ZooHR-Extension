
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Database,
  Users,
  UserSearch,
  ChartNoAxesCombined,
  CalendarCheck,
  Settings,
  Download,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  Filter,
  X
} from "lucide-react";

import {
  getAccessToken,
  getRangeValues,
  getEntireSheetValues,
  getSpreadsheetMetadata,
  parseSpreadsheetId
} from "../lib/sheets";

import { normalizeRows } from "../lib/normalize";
import { useZooStore } from "../store/useZooStore";
import "../styles.css";

const nav = [
  ["Overview", LayoutDashboard],
  ["Extraction", Database],
  ["Employees", Users],
  ["Recruitment", UserSearch],
  ["KPI & Performance", ChartNoAxesCombined],
  ["Attendance", CalendarCheck],
  ["Analytics", ChartNoAxesCombined],
  ["Settings", Settings]
] as const;

type FilterOperator =
  | "contains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "isEmpty"
  | "isNotEmpty";

type DynamicFilter = {
  id: number;
  column: string;
  operator: FilterOperator;
  value: string;
};

function compareValues(
  actual: string,
  operator: FilterOperator,
  expected: string
): boolean {
  const a = actual.trim();
  const b = expected.trim();

  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();

  switch (operator) {
    case "contains":
      return lowerA.includes(lowerB);

    case "equals":
      return lowerA === lowerB;

    case "notEquals":
      return lowerA !== lowerB;

    case "startsWith":
      return lowerA.startsWith(lowerB);

    case "endsWith":
      return lowerA.endsWith(lowerB);

    case "greaterThan": {
      const numberA = Number(a.replace(/,/g, ""));
      const numberB = Number(b.replace(/,/g, ""));

      if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
        return numberA > numberB;
      }

      return a > b;
    }

    case "lessThan": {
      const numberA = Number(a.replace(/,/g, ""));
      const numberB = Number(b.replace(/,/g, ""));

      if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
        return numberA < numberB;
      }

      return a < b;
    }

    case "isEmpty":
      return a === "";

    case "isNotEmpty":
      return a !== "";

    default:
      return true;
  }
}

function Workspace() {
  const [page, setPage] = useState("Overview");

  const [input, setInput] = useState("");
  const [range, setRange] = useState("");

  const [tabs, setTabs] = useState<
    { title: string; sheetId: number; index: number }[]
  >([]);

  const [tab, setTab] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<DynamicFilter[]>([]);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");

  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const {
    spreadsheetTitle,
    values,
    setData
  } = useZooStore();

  // Automatically detect all headers, columns and rows.
  const normalized = useMemo(
    () => normalizeRows(values),
    [values]
  );

  const headers = normalized.headers;
  const rows = normalized.rows;
  const columns = normalized.columns;

  // Apply dynamic filters and global search.
  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter(row =>
        headers.some(header =>
          String(row[header] ?? "")
            .toLowerCase()
            .includes(query)
        )
      );
    }

    if (filters.length) {
      result = result.filter(row => {
        const matches = filters.map(filter => {
          if (!filter.column) return true;

          return compareValues(
            String(row[filter.column] ?? ""),
            filter.operator,
            filter.value
          );
        });

        return filterLogic === "AND"
          ? matches.every(Boolean)
          : matches.some(Boolean);
      });
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valueA = String(a[sortColumn] ?? "");
        const valueB = String(b[sortColumn] ?? "");

        const numberA = Number(valueA.replace(/,/g, ""));
        const numberB = Number(valueB.replace(/,/g, ""));

        let comparison = 0;

        if (
          valueA.trim() !== "" &&
          valueB.trim() !== "" &&
          Number.isFinite(numberA) &&
          Number.isFinite(numberB)
        ) {
          comparison = numberA - numberB;
        } else {
          comparison = valueA.localeCompare(valueB, undefined, {
            numeric: true,
            sensitivity: "base"
          });
        }

        return sortDirection === "asc"
          ? comparison
          : -comparison;
      });
    }

    return result;
  }, [
    rows,
    headers,
    search,
    filters,
    filterLogic,
    sortColumn,
    sortDirection
  ]);

  async function connectSheet() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const id = parseSpreadsheetId(input);
      const token = await getAccessToken();

      const meta = await getSpreadsheetMetadata(id, token);

      const sheetTabs = meta.sheets
        .map(sheet => sheet.properties)
        .sort((a, b) => a.index - b.index);

      if (!sheetTabs.length) {
        throw new Error("এই Spreadsheet-এ কোনো Worksheet পাওয়া যায়নি।");
      }

      setTabs(sheetTabs);
      setTab(sheetTabs[0].title);

      // Clear previous spreadsheet data.
      setData({
        spreadsheetId: id,
        spreadsheetTitle: meta.properties.title,
        values: [],
        headers: [],
        range: ""
      });

      setFilters([]);
      setSearch("");
      setSortColumn("");

      setNotice(`Connected to ${meta.properties.title}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to connect."
      );
    } finally {
      setBusy(false);
    }
  }

  async function extract() {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const id = parseSpreadsheetId(input);
      const token = await getAccessToken();

      if (!tab) {
        throw new Error("প্রথমে একটি Worksheet নির্বাচন করুন।");
      }

      // Blank range means extract the entire worksheet's used range.
      const result = range.trim()
        ? await getRangeValues(
            id,
            `'${tab.replace(/'/g, "''")}'!${range.trim()}`,
            token
          )
        : await getEntireSheetValues(id, tab, token);

      const extractedValues = result.values ?? [];

      if (!extractedValues.length) {
        throw new Error("নির্বাচিত Worksheet বা Range-এ কোনো Data পাওয়া যায়নি।");
      }

      const data = normalizeRows(extractedValues);

      setData({
        spreadsheetId: id,
        spreadsheetTitle,
        values: extractedValues,
        headers: data.headers,
        range: result.range
      });

      setFilters([]);
      setSearch("");
      setSortColumn("");
      setPage("Extraction");

      setNotice(
        `${data.rows.length} rows and ${data.headers.length} columns extracted successfully.`
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Extraction failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function addFilter() {
    const firstColumn = headers[0];

    if (!firstColumn) return;

    setFilters(old => [
      ...old,
      {
        id: Date.now() + Math.random(),
        column: firstColumn,
        operator: "contains",
        value: ""
      }
    ]);
  }

  function updateFilter(
    id: number,
    updates: Partial<DynamicFilter>
  ) {
    setFilters(old =>
      old.map(filter =>
        filter.id === id
          ? { ...filter, ...updates }
          : filter
      )
    );
  }

  function removeFilter(id: number) {
    setFilters(old =>
      old.filter(filter => filter.id !== id)
    );
  }

  function clearFilters() {
    setFilters([]);
    setSearch("");
  }

  function toggleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(old =>
        old === "asc" ? "desc" : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function exportCsv() {
    if (!filteredRows.length || !headers.length) return;

    const quote = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(quote).join(","),
      ...filteredRows.map(row =>
        headers.map(header => quote(row[header])).join(",")
      )
    ].join("\r\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "zoohr-export.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  const hasData = rows.length > 0;

  return (
    <div className="min-h-screen md:flex">

      {/* Sidebar */}
      <aside className="w-full border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">

        <div className="mb-7 flex items-center gap-2">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Users size={18} />
          </div>
          <strong className="text-xl">ZooHR</strong>
        </div>

        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
          Workspace
        </p>

        <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => setPage(label)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                page === label
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-7 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          Local-first · Read-only Google Sheets access
        </div>
      </aside>

      {/* Main workspace */}
      <main className="min-w-0 flex-1 p-5 md:p-8">

        <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              ZOOHR / WORKSPACE
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {page}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Dynamic Spreadsheet Data Workspace
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            AI: Later
          </span>
        </header>

        {/* Overview */}
        {page === "Overview" && (
          <div className="grid gap-4 lg:grid-cols-2">

            <section className="panel p-5 lg:col-span-2">
              <h2 className="font-semibold">
                Connect a Google Spreadsheet
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Connect any Google Spreadsheet. ZooHR will automatically
                detect its worksheets, headers and data.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="field"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Paste Google Sheets URL or Spreadsheet ID"
                />

                <button
                  className="btn btn-primary"
                  disabled={busy || !input.trim()}
                  onClick={connectSheet}
                >
                  {busy ? "Connecting…" : "Connect"}
                </button>
              </div>

              {spreadsheetTitle && (
                <p className="mt-3 text-sm text-emerald-700">
                  Connected: {spreadsheetTitle}
                </p>
              )}
            </section>

            <section className="panel p-5">
              <h2 className="font-semibold">
                Data extraction
              </h2>

              <label className="mt-4 block text-xs font-semibold text-slate-500">
                WORKSHEET
              </label>

              <select
                className="field mt-1"
                value={tab}
                onChange={e => setTab(e.target.value)}
              >
                <option value="">Select worksheet</option>

                {tabs.map(t => (
                  <option key={t.sheetId} value={t.title}>
                    {t.title}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-semibold text-slate-500">
                CELL RANGE (OPTIONAL)
              </label>

              <input
                className="field mt-1"
                value={range}
                onChange={e => setRange(e.target.value)}
                placeholder="Leave blank for entire worksheet"
              />

              <p className="mt-1 text-xs text-slate-400">
                Example: A1:Z500 or A:Z. Leave empty to extract the
                entire worksheet's used range.
              </p>

              <button
                className="btn btn-primary mt-4 w-full"
                disabled={busy || !input.trim() || !tab}
                onClick={extract}
              >
                <RefreshCw size={15} />
                {busy ? "Extracting…" : "Extract data"}
              </button>
            </section>

            <section className="panel p-5">
              <h2 className="font-semibold">
                Workspace features
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  "Dynamic Table",
                  "Custom Filters",
                  "Sorting",
                  "Global Search",
                  "Data Analysis",
                  "CSV Export"
                ].map(feature => (
                  <div
                    key={feature}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Extraction workspace */}
        {page === "Extraction" && (
          <section className="panel p-5">

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Dynamic Spreadsheet Data
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {spreadsheetTitle || "No spreadsheet"} ·{" "}
                  {rows.length} records · {headers.length} columns
                </p>
              </div>

              <button
                className="btn btn-secondary"
                onClick={exportCsv}
                disabled={!filteredRows.length}
              >
                <Download size={15} />
                Export CSV ({filteredRows.length})
              </button>
            </div>

            {hasData ? (
              <>
                {/* Data summary */}
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Total Records
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {rows.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Total Columns
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {headers.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Filtered Records
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {filteredRows.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">
                      Empty Cells
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {columns.reduce(
                        (total, column) => total + column.emptyValues,
                        0
                      )}
                    </p>
                  </div>
                </div>

                {/* Column information */}
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">
                    Detected Columns
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {columns.map(column => (
                      <span
                        key={column.name}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        title={`${column.totalValues} values · ${column.emptyValues} empty`}
                      >
                        <strong>{column.name}</strong>
                        <span className="ml-2 text-slate-400">
                          {column.type}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Filter builder */}
                <div className="mt-6 rounded-xl border border-slate-200 p-4">

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Filter size={17} />
                      <h3 className="font-semibold">
                        Dynamic Filter Builder
                      </h3>
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={addFilter}
                    >
                      <Plus size={15} />
                      Add filter
                    </button>
                  </div>

                  {filters.length > 1 && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Match conditions using
                      </span>

                      <select
                        className="field max-w-32"
                        value={filterLogic}
                        onChange={e =>
                          setFilterLogic(e.target.value as "AND" | "OR")
                        }
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                  )}

                  {filters.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No filters applied. Add a filter to narrow down
                      your spreadsheet data.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {filters.map((filter, index) => (
                        <div
                          key={filter.id}
                          className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <select
                            className="field"
                            value={filter.column}
                            onChange={e =>
                              updateFilter(filter.id, {
                                column: e.target.value
                              })
                            }
                          >
                            {headers.map(header => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>

                          <select
                            className="field"
                            value={filter.operator}
                            onChange={e =>
                              updateFilter(filter.id, {
                                operator: e.target.value as FilterOperator
                              })
                            }
                          >
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="notEquals">Does not equal</option>
                            <option value="startsWith">Starts with</option>
                            <option value="endsWith">Ends with</option>
                            <option value="greaterThan">Greater than</option>
                            <option value="lessThan">Less than</option>
                            <option value="isEmpty">Is empty</option>
                            <option value="isNotEmpty">Is not empty</option>
                          </select>

                          {filter.operator !== "isEmpty" &&
                           filter.operator !== "isNotEmpty" ? (
                            <input
                              className="field"
                              value={filter.value}
                              onChange={e =>
                                updateFilter(filter.id, {
                                  value: e.target.value
                                })
                              }
                              placeholder="Enter value"
                            />
                          ) : (
                            <div className="flex items-center text-xs text-slate-400">
                              No value required
                            </div>
                          )}

                          <button
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            onClick={() => removeFilter(filter.id)}
                            title={`Remove filter ${index + 1}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(filters.length > 0 || search) && (
                    <button
                      className="mt-3 text-xs font-semibold text-red-600"
                      onClick={clearFilters}
                    >
                      Clear all filters and search
                    </button>
                  )}
                </div>

                {/* Search and sorting */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      className="field pl-9"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search across all columns..."
                    />
                  </div>

                  <select
                    className="field sm:max-w-56"
                    value={sortColumn}
                    onChange={e => setSortColumn(e.target.value)}
                  >
                    <option value="">Sort by column</option>

                    {headers.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn btn-secondary"
                    disabled={!sortColumn}
                    onClick={() =>
                      setSortDirection(old =>
                        old === "asc" ? "desc" : "asc"
                      )
                    }
                  >
                    <ArrowUpDown size={15} />
                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                  </button>
                </div>

                {/* Dynamic table */}
                <div className="mt-5 overflow-auto rounded-lg border border-slate-200">

                  <table className="min-w-full border-collapse text-left text-xs">

                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-3 font-semibold text-slate-500">
                          #
                        </th>

                        {headers.map(header => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-3 py-3 font-semibold"
                          >
                            <button
                              className="flex items-center gap-2 hover:text-blue-600"
                              onClick={() => toggleSort(header)}
                            >
                              {header}
                              <ArrowUpDown size={12} />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.slice(0, 500).map((row, index) => (
                        <tr
                          key={row.__sourceRow}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                            {index + 1}
                          </td>

                          {headers.map(header => (
                            <td
                              key={header}
                              className="max-w-64 whitespace-nowrap px-3 py-3"
                              title={row[header]}
                            >
                              {row[header] || (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={headers.length + 1}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No matching records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 500 && (
                  <p className="mt-3 text-xs text-amber-600">
                    Showing the first 500 matching records. CSV export
                    includes all matching records.
                  </p>
                )}

                <p className="mt-3 text-xs text-slate-400">
                  Showing {Math.min(filteredRows.length, 500)} of{" "}
                  {filteredRows.length} matching records.
                </p>
              </>
            ) : (
              <div className="py-12 text-center">
                <FileSpreadsheet
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-4 font-semibold">
                  No extracted data
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Connect a spreadsheet and extract a worksheet first.
                </p>

                <button
                  className="btn btn-primary mt-4"
                  onClick={() => setPage("Overview")}
                >
                  Go to Overview
                </button>
              </div>
            )}
          </section>
        )}

        {/* Other modules */}
        {!["Overview", "Extraction"].includes(page) && (
          <section className="panel p-6">
            <h2 className="font-semibold">{page}</h2>

            <p className="mt-2 text-sm text-slate-500">
              This module will use the same dynamic spreadsheet data
              engine. No fixed column names are required.
            </p>

            <button
              className="btn btn-secondary mt-4"
              onClick={() => setPage("Extraction")}
            >
              Go to Dynamic Data
            </button>
          </section>
        )}

        {(error || notice) && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || notice}
          </div>
        )}

        <footer className="mt-8 text-xs text-slate-400">
          ZooHR MVP · Data stays in your browser unless you export it.
        </footer>

      </main>
    </div>
  );
}

createRoot(
  document.getElementById("root")!
).render(<Workspace />);
