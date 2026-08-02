import { motion } from "motion/react";
import { useKnowledge } from "@/store/knowledge";
import { CoverBanner } from "./cover-banner";
import { PageAvatar } from "./page-avatar";
import { Breadcrumbs } from "./breadcrumbs";
import { EditableTitle } from "./editable-title";
import { HomeDashboard } from "./home-dashboard";
import { BlockEditor } from "../editor/block-editor";
// WhiteboardPage is kept as an import but disabled in the render logic to prevent crashes
// import { WhiteboardPage } from "./whiteboard-page";

export function Canvas() {
  const { activePage, patchPage, setContent, syncing } = useKnowledge();

  if (!activePage) {
    return <HomeDashboard />;
  }

  // Whiteboard display is strictly disabled to prevent deployment crashes.
  // The code remains in the project for future restoration.
  if (activePage.kind === "whiteboard") {
    return (
      <div className="flex h-full items-center justify-center bg-[#08080A] p-8 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-white/90">Whiteboards are temporarily disabled</h2>
          <p className="mt-2 text-sm text-white/40">
            This page type is currently unavailable. You can still access your other documents from the sidebar.
          </p>
        </div>
      </div>
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
          <BlockEditor
            pageId={activePage.id}
            content={activePage.content}
            onChange={(c) => setContent(activePage.id, c)}
          />
        </div>
      </div>
    </motion.main>
  );
}