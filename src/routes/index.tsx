import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { KnowledgeProvider } from "@/store/knowledge";
import { AmbientBackground } from "@/components/os/ambient-background";
import { Sidebar } from "@/components/os/sidebar";
import { Canvas } from "@/components/os/canvas";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Knowledge OS — Block-Based Thinking Workspace" },
      {
        name: "description",
        content:
          "A dark, block-based knowledge workspace. Create pages, nest them infinitely, and capture thoughts instantly.",
      },
    ],
  }),
  component: Index,
});

function WorkspaceContent({ 
  collapsed, 
  setCollapsed, 
  isMobile, 
  mobileOpen, 
  setMobileOpen, 
  mobileOpenerRef 
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  mobileOpenerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <KnowledgeProvider>
      <div className="relative flex h-dvh w-full overflow-hidden text-white antialiased">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Dismiss sidebar"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          />
        )}
        
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((v) => !v)}
          onMobileClose={() => setMobileOpen(false)}
          onMobileToolClose={() => mobileOpenerRef.current?.focus()}
        />

        {!mobileOpen && (
          <button
            ref={mobileOpenerRef}
            type="button"
            aria-label="Open sidebar"
            onClick={() => setMobileOpen(true)}
            className="fixed left-3 top-3 z-30 flex size-10 items-center justify-center rounded-xl border border-white/[0.09] bg-[#111118]/94 text-white/65 shadow-lg md:hidden"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <Canvas />
        </div>
      </div>
      <Toaster position="bottom-right" theme="dark" />
    </KnowledgeProvider>
  );
}

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <>
      <AmbientBackground />
      <WorkspaceContent 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        mobileOpenerRef={mobileOpenerRef}
      />
    </>
  );
}