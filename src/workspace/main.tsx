import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard, Database, Users, UserSearch, ChartNoAxesCombined, CalendarCheck, Settings, Download, RefreshCw, FileSpreadsheet } from "lucide-react";
import { getAccessToken, getRangeValues, getSpreadsheetMetadata, parseSpreadsheetId } from "../lib/sheets";
import { suggestMappings } from "../lib/headers";
import { normalizeRows } from "../lib/normalize";
import { useZooStore } from "../store/useZooStore";
import "../styles.css";

const nav = [
  ["Overview", LayoutDashboard], ["Extraction", Database], ["Employees", Users],
  ["Recruitment", UserSearch], ["KPI & Performance", ChartNoAxesCombined],
  ["Attendance", CalendarCheck], ["Analytics", ChartNoAxesCombined], ["Settings", Settings]
] as const;

function Workspace() {
  const [page, setPage] = useState("Overview");
  const [input, setInput] = useState("");
  const [range, setRange] = useState("A1:H100");
  const [tabs, setTabs] = useState<{title:string;sheetId:number;index:number}[]>([]);
  const [tab, setTab] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mapping, setMapping] = useState<Record<string,string>>({});
  const [notice, setNotice] = useState("");
  const { spreadsheetTitle, values, headers, setData } = useZooStore();
  const normalized = useMemo(() => normalizeRows(values, mapping), [values, mapping]);

  async function connectSheet() {
    setBusy(true); setError(""); setNotice("");
    try {
      const id = parseSpreadsheetId(input);
      const token = await getAccessToken();
      const meta = await getSpreadsheetMetadata(id, token);
      const sheetTabs = meta.sheets.map(s => s.properties).sort((a,b) => a.index-b.index);
      setTabs(sheetTabs); setTab(sheetTabs[0]?.title ?? "");
      setData({ spreadsheetId: id, spreadsheetTitle: meta.properties.title });
      setNotice(`Connected to ${meta.properties.title}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to connect."); }
    finally { setBusy(false); }
  }

  async function extract() {
    setBusy(true); setError(""); setNotice("");
    try {
      const id = parseSpreadsheetId(input);
      const token = await getAccessToken();
      const fullRange = tab ? `'${tab.replace(/'/g, "''")}'!${range}` : range;
      const result = await getRangeValues(id, fullRange, token);
      const rows = result.values ?? [];
      const foundHeaders = (rows[0] ?? []).map(v => String(v ?? ""));
      setData({ values: rows, headers: foundHeaders, range: fullRange });
      setMapping(suggestMappings(foundHeaders));
      setPage("Extraction");
      setNotice(`${Math.max(rows.length - 1, 0)} data rows extracted.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Extraction failed."); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    const rows = normalized.rows;
    if (!rows.length) return;
    const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [keys.map(quote).join(","), ...rows.map(row => keys.map(key => quote((row as Record<string,unknown>)[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "zoohR-export.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="min-h-screen md:flex">
    <aside className="w-full border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="mb-7 flex items-center gap-2"><div className="rounded-xl bg-blue-600 p-2 text-white"><Users size={18}/></div><strong className="text-xl">ZooHR</strong></div>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
      <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
        {nav.map(([label, Icon]) => <button key={label} onClick={() => setPage(label)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${page===label ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={16}/>{label}</button>)}
      </nav>
      <div className="mt-7 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Local-first · Read-only Google Sheets access</div>
    </aside>
    <main className="min-w-0 flex-1 p-5 md:p-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs text-slate-500">ZOOHR / WORKSPACE</p><h1 className="mt-1 text-2xl font-bold">{page}</h1><p className="mt-1 text-sm text-slate-500">Manage and analyze your selected HR spreadsheet data.</p></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">AI: Later</span>
      </header>

      {page === "Overview" && <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5 lg:col-span-2"><h2 className="font-semibold">Connect a Google Spreadsheet</h2><p className="mt-1 text-sm text-slate-500">Paste a Google Sheets URL or Spreadsheet ID to get started.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input className="field" value={input} onChange={e=>setInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."/><button className="btn btn-primary" disabled={busy || !input.trim()} onClick={connectSheet}>{busy ? "Connecting…" : "Connect"}</button></div>{spreadsheetTitle && <p className="mt-3 text-sm text-emerald-700">Connected: {spreadsheetTitle}</p>}</section>
        <section className="panel p-5"><h2 className="font-semibold">Quick extraction</h2><label className="mt-4 block text-xs font-semibold text-slate-500">WORKSHEET</label><select className="field mt-1" value={tab} onChange={e=>setTab(e.target.value)}><option value="">Select worksheet</option>{tabs.map(t=><option key={t.sheetId} value={t.title}>{t.title}</option>)}</select><label className="mt-3 block text-xs font-semibold text-slate-500">CELL RANGE</label><input className="field mt-1" value={range} onChange={e=>setRange(e.target.value)} placeholder="A1:H100"/><button className="btn btn-primary mt-4 w-full" disabled={busy || !input.trim()} onClick={extract}><RefreshCw size={15}/> {busy ? "Working…" : "Extract selected range"}</button></section>
        <section className="panel p-5"><h2 className="font-semibold">HR modules</h2><div className="mt-3 grid grid-cols-2 gap-2">{["Employees","Recruitment","KPI & Performance","Attendance"].map(x=><button key={x} onClick={()=>setPage(x)} className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-blue-300">{x}</button>)}</div><p className="mt-4 text-xs text-slate-500">Module dashboards will use the same validated extraction engine.</p></section>
      </div>}

      {page === "Extraction" && <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Extracted data</h2><p className="text-xs text-slate-500">{spreadsheetTitle || "No spreadsheet"} · {values.length ? values.length-1 : 0} records</p></div><button className="btn btn-secondary" onClick={exportCsv} disabled={!normalized.rows.length}><Download size={15}/> Export CSV</button></div>
        {headers.length > 0 && <><h3 className="mt-6 text-sm font-semibold">Confirm header mapping</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{headers.map(h=><label key={h} className="text-xs text-slate-600">{h || "(blank header)"}<select className="field mt-1" value={mapping[h] ?? ""} onChange={e=>setMapping(old=>({...old,[h]:e.target.value}))}><option value="">Ignore column</option>{["employee_name","employee_id","email","department","designation","joining_date","status"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}</div></>}
        {normalized.issues.length > 0 && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><strong>Validation warnings</strong><ul className="mt-1 list-disc pl-5">{normalized.issues.slice(0,8).map(x=><li key={x}>{x}</li>)}</ul></div>}
        {values.length > 0 ? <div className="mt-5 overflow-auto"><table className="min-w-full border-collapse text-left text-xs"><tbody>{values.slice(0,11).map((row,i)=><tr key={i} className={i===0?"bg-slate-50 font-semibold": "border-t border-slate-100"}>{row.map((cell,j)=><td key={j} className="max-w-56 whitespace-nowrap px-3 py-2">{String(cell ?? "")}</td>)}</tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-slate-500">No data yet. Connect a spreadsheet and extract a range from Overview.</p>}
      </section>}

      {!["Overview","Extraction"].includes(page) && <section className="panel p-6"><h2 className="font-semibold">{page} module</h2><p className="mt-2 text-sm text-slate-500">The module interface is scaffolded. Its domain-specific processing and analytics will be implemented after the Google Sheets extraction workflow is verified.</p><button className="btn btn-secondary mt-4" onClick={()=>setPage("Extraction")}>Go to extraction</button></section>}
      {(error || notice) && <div className={`mt-4 rounded-lg p-3 text-sm ${error?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>}
      <footer className="mt-8 text-xs text-slate-400">ZooHR MVP · Data stays in your browser unless you export it.</footer>
    </main>
  </div>;
}
createRoot(document.getElementById("root")!).render(<Workspace/>);
