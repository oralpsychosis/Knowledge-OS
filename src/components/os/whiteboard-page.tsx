import { lazy, Suspense, useEffect, useState } from "react";
import { LoaderCircle, PenLine } from "lucide-react";
import type { KnowledgePage, WhiteboardScene } from "@/lib/types";

const WhiteboardEditor = lazy(() => import("./whiteboard-editor"));

interface WhiteboardPageProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

function WhiteboardLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#0e0e14]">
      <div className="flex items-center gap-3 text-white/45">
        <span className="flex size-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
          <PenLine className="size-4 text-violet-200/70" />
        </span>
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
          <LoaderCircle className="size-3.5 animate-spin" />
          Opening whiteboard
        </span>
      </div>
    </div>
  );
}

export function WhiteboardPage(props: WhiteboardPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const browserWindow = window as Window & { EXCALIDRAW_ASSET_PATH?: string };
    browserWindow.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
    setMounted(true);
  }, []);

  if (!mounted) return <WhiteboardLoading />;

  return (
    <Suspense fallback={<WhiteboardLoading />}>
      <WhiteboardEditor {...props} />
    </Suspense>
  );
}
