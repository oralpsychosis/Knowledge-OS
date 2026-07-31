import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KnowledgeProvider } from "@/store/knowledge";
import { Sidebar } from "@/components/os/sidebar";
import { Canvas } from "@/components/os/canvas";
import { AmbientBackground } from "@/components/os/ambient-background";
import { SyncTestBadge } from "@/components/os/sync-test-badge";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Knowledge OS — Block-Based Thinking Workspace" },
      {
        name: "description",
        content:
          "A dark, block-based knowledge workspace. Create pages, nest them infinitely, and capture thoughts instantly with slash commands and inline editing.",
      },
      { property: "og:title", content: "Knowledge OS — Block-Based Thinking Workspace" },
      {
        property: "og:description",
        content:
          "Zero-friction note capture: nested pages, slash-command blocks, to-dos and code, saved locally.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <KnowledgeProvider>
      <AmbientBackground />
      <div className="relative flex h-screen w-full overflow-hidden text-white antialiased">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <Canvas />
      </div>
      <SyncTestBadge />
      <Toaster position="bottom-right" theme="dark" />
    </KnowledgeProvider>
  );
}
