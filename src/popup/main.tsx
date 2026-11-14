import React from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard, FileSpreadsheet, Settings, ExternalLink } from "lucide-react";
import "../styles.css";

function Popup() {
  const openWorkspace = () => chrome.runtime.sendMessage({ type: "OPEN_WORKSPACE" });
  return <main className="w-[340px] p-4 space-y-4">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2"><div className="rounded-xl bg-blue-600 p-2 text-white"><LayoutDashboard size={18}/></div><strong className="text-lg">ZooHR</strong></div>
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Local mode</span>
    </header>
    <section className="panel p-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">HR workspace</p>
      <h1 className="text-base font-semibold">Your HR data, organized.</h1>
      <p className="text-sm text-slate-500">Extract, validate and analyze selected Google Sheets data.</p>
    </section>
    <button className="btn btn-primary w-full" onClick={openWorkspace}><FileSpreadsheet size={16}/> Open workspace <ExternalLink size={14}/></button>
    <div className="flex items-center justify-between text-xs text-slate-500"><span>AI features: planned for later</span><span className="flex items-center gap-1"><Settings size={13}/> Settings in workspace</span></div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Popup/>);
