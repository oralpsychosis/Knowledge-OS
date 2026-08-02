import { PenLine } from "lucide-react";
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
      <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
        <PenLine className="size-6 text-violet-200" />
      </div>
      <h2 className="mt-4 text-lg font-medium text-white/90">
        Whiteboard (Disabled for Diagnostic Test)
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/40">
        Excalidraw is temporarily unlinked to verify if the production deployment loads without SSR crashes.
      </p>
      <input
        value={page.title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled whiteboard"
        className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-violet-400/50"
      />
    </div>
  );
}