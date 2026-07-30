import { ChevronRight } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import { getAncestors } from "@/lib/pages";

export function Breadcrumbs({ pageId }: { pageId: string }) {
  const { state, select } = useKnowledge();
  const trail = getAncestors(state, pageId);

  return (
    <nav className="flex flex-wrap items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
      {trail.map((page, i) => (
        <span key={page.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-white/20" />}
          <button
            type="button"
            onClick={() => select(page.id)}
            className="truncate transition-colors hover:text-violet-200"
          >
            {page.title || "Untitled"}
          </button>
        </span>
      ))}
    </nav>
  );
}
