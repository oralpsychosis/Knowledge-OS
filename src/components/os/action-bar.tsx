import { useState, useEffect } from "react";
import { SearchModal } from "./search-modal";
import { TemplatesModal } from "./templates-modal";
import { GraphModal } from "./graph-modal";
import { KeysModal } from "./keys-modal";

const ACTIONS = [
  { id: "search", icon: "🔍", label: "Search" },
  { id: "templates", icon: "📑", label: "Tmpl" },
  { id: "graph", icon: "🕸️", label: "Graph" },
  { id: "keys", icon: "⌨️", label: "Keys" },
] as const;

export function ActionBar() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setActive((p) => (p === "search" ? null : "search"));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActive(a.id === active ? null : a.id)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-all ${
              active === a.id
                ? "bg-violet-500/15 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                : "text-white/35 hover:bg-white/[0.04] hover:text-white/70"
            }`}
          >
            <span className="text-[15px]">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {active === "search" && (
        <SearchModal open={true} onOpenChange={(v) => { if (!v) setActive(null); }} />
      )}
      {active === "templates" && (
        <TemplatesModal open={true} onOpenChange={(v) => { if (!v) setActive(null); }} />
      )}
      {active === "graph" && (
        <GraphModal open={true} onOpenChange={(v) => { if (!v) setActive(null); }} />
      )}
      {active === "keys" && (
        <KeysModal open={true} onOpenChange={(v) => { if (!v) setActive(null); }} />
      )}
    </>
  );
}
