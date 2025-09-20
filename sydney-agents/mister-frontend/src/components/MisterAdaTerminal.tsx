"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface SymbolItem { unit: string; ticker?: string; source?: string }
interface AnalysisEvent { kind: "analysis"; timestamp: string; userId: string; summary?: string; symbols: SymbolItem[] }
interface StatusEvent { kind: "status"; timestamp: string; userId: string; message: string; meta?: Record<string, any> }

type Props = { userId: string };

export default function MisterAdaTerminal({ userId }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const [latestSymbols, setLatestSymbols] = useState<SymbolItem[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new logs
  useEffect(() => {
    const el = scrollerRef.current; if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  useEffect(() => {
    let es: EventSource | null = null;
    let aborted = false;

    async function openStream() {
      try {
        // Optional token scaffold
        let token = "";
        try {
          const r = await fetch("/api/realtime/token");
          const j = await r.json(); token = j?.token || "";
        } catch {}

        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const url = `${base}/events/${encodeURIComponent(userId)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        es = new EventSource(url);

        // Named events: analysis
        es.addEventListener("analysis", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as AnalysisEvent;
            setLatestSymbols(data.symbols || []);
            setLogs((L) => [
              ...L,
              `== Analysis ${new Date(data.timestamp).toLocaleTimeString()}`,
              ...(data.symbols || []).map((s) => `• ${s.ticker || "(unknown)"} [${s.source || "?"}] ${s.unit}`),
            ].slice(-500));
          } catch {}
        });

        // Named events: status
        es.addEventListener("status", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as StatusEvent;
            setLogs((L) => [ ...L, `status: ${data.message}`].slice(-500));
          } catch {}
        });

        // Heartbeat ping (optional)
        es.addEventListener("ping", () => {});

        setLogs((L) => [...L, `connected to ${url}`]);
      } catch (e) {
        setLogs((L) => [...L, `failed to connect SSE: ${String(e)}`].slice(-500));
      }
    }

    if (!aborted) openStream();
    return () => { aborted = true; try { es?.close(); } catch {} };
  }, [userId]);

  const tokensList = useMemo(() => latestSymbols.map((s) => `${s.ticker || "(unknown)"} — ${s.unit} (${s.source || "?"})`), [latestSymbols]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {tokensList.length > 0 && (
        <div style={{ background: "#0F172A", color: "#E5E7EB", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Most recent analysis: tokens</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {tokensList.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </div>
      )}

      <div ref={scrollerRef} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#0B0F16", color: "#D1D5DB", padding: 12, borderRadius: 8, height: 320, overflow: "auto", border: "1px solid #1F2937" }}>
        {logs.map((line, idx) => (<div key={idx}>{line}</div>))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setLogs([])} style={{ background: "#111827", color: "#E5E7EB", border: "1px solid #374151", borderRadius: 6, padding: "6px 10px" }}>Clear</button>
      </div>
    </div>
  );
}

