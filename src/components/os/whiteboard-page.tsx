import { useEffect, useState } from "react";
import { LoaderCircle, PenLine } from "lucide-react";
import type { KnowledgePage, WhiteboardScene } from "@/lib/types";

interface WhiteboardPageProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

function Fallback() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[#0e0e14] p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
        <PenLine className="size-6 text-violet-200" />
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
        <LoaderCircle className="size-4 animate-spin text-violet-300" />
        Loading whiteboard...
      </div>
    </div>
  );
}

export function WhiteboardPage(props: WhiteboardPageProps) {
  const [EditorComponent, setEditorComponent] = useState<React.ComponentType<WhiteboardPageProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Strictly load the browser-only Excalidraw module inside useEffect (client-side only)
    import("./whiteboard-editor").then((module) => {
      if (mounted) {
        setEditorComponent(() => module.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!EditorComponent) {
    return <Fallback />;
  }

  return <EditorComponent {...props} />;
}