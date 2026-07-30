import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock, FileText, LayoutGrid, Plus, SortAsc, Zap } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import type { KnowledgePage } from "@/lib/types";

function Thumb({ page }: { page: KnowledgePage }) {
  if (page.coverImage) {
    return <img src={page.coverImage} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-transparent">
      {page.icon ? (
        <span className="text-2xl leading-none">{page.icon}</span>
      ) : (
        <FileText className="h-6 w-6 text-violet-200/50" />
      )}
    </div>
  );

}

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function HomeDashboard() {
  const { state, select, addPage } = useKnowledge();
  const [sort, setSort] = useState<"updated" | "name">("updated");

  const pages = useMemo(() => Object.values(state.pages), [state.pages]);

  const recents = useMemo(
    () => [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6),
    [pages],
  );

  const all = useMemo(() => {
    const list = [...pages];
    return sort === "updated"
      ? list.sort((a, b) => b.updatedAt - a.updatedAt)
      : list.sort((a, b) => (a.title || "Untitled").localeCompare(b.title || "Untitled"));
  }, [pages, sort]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="os-scroll h-full flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-5xl px-8 pb-32 pt-16 md:px-14">
        <p className="text-[10px] uppercase tracking-[0.28em] text-violet-300/50">Knowledge OS</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white/95">Home</h1>
        <p className="mt-2 text-sm text-white/40">
          {pages.length} page{pages.length === 1 ? "" : "s"} in this workspace — pick up where you
          left off.
        </p>

        {/* Quick access */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => addPage(null)}
            className="os-glow-hover flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/15 text-violet-200">
              <Plus className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[13px] font-medium text-white/90">New page</span>
              <span className="block text-[11px] text-white/35">Capture a thought now</span>
            </span>
          </button>
          {recents.slice(0, 2).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              className="os-glow-hover flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-xl"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-200">
                <Zap className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-white/90">
                  {p.title || "Untitled"}
                </span>
                <span className="block text-[11px] text-white/35">{timeAgo(p.updatedAt)}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Jump back in */}
        <div className="mt-14 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-white/35" />
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-white/40">Jump back in</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {recents.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="os-glow-hover group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left backdrop-blur-xl"
            >
              <div className="h-24 w-full overflow-hidden">
                <Thumb page={p} />
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-medium text-white/90">
                  {p.title || "Untitled"}
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">Edited {timeAgo(p.updatedAt)}</p>
              </div>
            </motion.button>
          ))}
          {!recents.length && (
            <p className="col-span-full text-[12px] text-white/30">
              Nothing yet — create your first page.
            </p>
          )}
        </div>

        {/* All pages */}
        <div className="mt-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-white/35" />
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-white/40">All pages</h2>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl">
            {(
              [
                ["updated", "Last updated", Clock],
                ["name", "Name", SortAsc],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                  sort === key
                    ? "bg-violet-500/20 text-violet-100"
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
          {all.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
            >
              {p.avatarImage ? (
                <img src={p.avatarImage} alt="" className="h-5 w-5 rounded object-cover" />
              ) : p.icon ? (
                <span className="w-5 text-center text-[13px] leading-none">{p.icon}</span>
              ) : (
                <FileText className="h-4 w-4 text-white/25" />
              )}
              <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">
                {p.title || "Untitled"}
              </span>
              <span className="shrink-0 text-[11px] text-white/30">{timeAgo(p.updatedAt)}</span>
            </button>
          ))}
          {!all.length && (
            <p className="px-4 py-6 text-center text-[12px] text-white/30">No pages yet</p>
          )}
        </div>
      </div>
    </motion.main>
  );
}
