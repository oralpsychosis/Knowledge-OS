"use client";

import { lazy, Suspense } from "react";
import { Loader2, PenLine } from "lucide-react";
import type { KnowledgePage, WhiteboardScene } from "@/lib/types";

const WhiteboardEditor = lazy(() => import("./whiteboard-editor"));

interface WhiteboardPageProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

export function WhiteboardPage(props: WhiteboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#0e0e14] p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
            <Loader2 className="size-7 animate-spin text-violet-200" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-white/90">
            Loading Whiteboard...
          </h2>
        </div>
      }
    >
      <WhiteboardEditor {...props} />
    </Suspense>
  );
}