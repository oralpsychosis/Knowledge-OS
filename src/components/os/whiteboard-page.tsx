import { PenLine, Sparkles } from "lucide-react";
import type { KnowledgePage, WhiteboardScene } from "@/lib/types";

interface WhiteboardPageProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

export function WhiteboardPage({ page, onTitleChange }: WhiteboardPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#0e0e14] p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15 shadow-xl shadow-violet-500/10">
        <PenLine className="size-7 text-violet-200" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white/90">
        {page.title || "Untitled Whiteboard"}
      </h2>
      <p className="mt-2 max-w-md text-xs text-white/45 leading-relaxed">
        Testing diagnostic mode: Excalidraw is currently disabled to check if the workspace loads smoothly.
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200">
        <Sparkles className="size-3.5" />
        Diagnostic test active
      </div>
    </div>
  );
}