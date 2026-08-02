import { motion } from "motion/react";
import { lazy, Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import { CoverBanner } from "./cover-banner";
import { PageAvatar } from "./page-avatar";
import { Breadcrumbs } from "./breadcrumbs";
import { EditableTitle } from "./editable-title";
import { HomeDashboard } from "./home-dashboard";

// Lazy load heavy page content
const BlockEditor = lazy(() => import("../editor/block-editor").then(m => ({ default: m.BlockEditor })));
const WhiteboardPage = lazy(() => import("./whiteboard-page").then(m => ({ default: m.WhiteboardPage })));

function ContentFallback() {
  return (
    <div className="flex h-32 items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/20">
      <LoaderCircle className="size-4 animate-spin" />
      Opening...
    </div>
  );
}

export function Canvas() {
  const { activePage, patchPage, setContent, setWhiteboard, syncing } = useKnowledge();

  if (!activePage) {
    return <HomeDashboard />;
  }

  if (activePage.kind === "whiteboard") {
    return (
      <motion.div
        key={activePage.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex h-full min-w-0 flex-1"
      >
        <Suspense fallback={<div className="flex-1 bg-[#0e0e14]" />}>
          <WhiteboardPage
            page={activePage}
            syncing={syncing}
            onTitleChange={(title) => patchPage(activePage.id, { title })}
            onSceneChange={(scene) => setWhiteboard(activePage.id, scene)}
          />
        </Suspense>
      </motion.div>
    );
  }

  return (
    <motion.main
      key={activePage.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="os-scroll h-full flex-1 overflow-y-auto"
    >
      <CoverBanner
        cover={activePage.coverImage}
        onChange={(v) => patchPage(activePage.id, { coverImage: v })}
      />
      <PageAvatar
        avatar={activePage.avatarImage}
        icon={activePage.icon}
        onChange={(v) => patchPage(activePage.id, { avatarImage: v })}
      />

      <div className="mx-auto w-full max-w-3xl px-8 pb-32 pt-6 md:px-16">
        <Breadcrumbs pageId={activePage.id} />
        <div className="mt-4">
          <EditableTitle
            pageId={activePage.id}
            value={activePage.title}
            autoFocus={activePage.title === ""}
            onChange={(v) => patchPage(activePage.id, { title: v })}
          />
        </div>
        <div className="mt-6">
          <Suspense fallback={<ContentFallback />}>
            <BlockEditor
              pageId={activePage.id}
              content={activePage.content}
              onChange={(c) => setContent(activePage.id, c)}
            />
          </Suspense>
        </div>
      </div>
    </motion.main>
  );
}