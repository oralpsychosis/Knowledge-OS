import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { LoaderCircle, PanelLeftOpen } from "lucide-react";
import { KnowledgeProvider } from "@/store/knowledge";
import { AmbientBackground } from "@/components/os/ambient-background";
import { Toaster } from "@/components/ui/sonner";

// Lazy load the main workspace surfaces
const Sidebar = lazy(() => import("@/components/os/sidebar").then(m => ({ default: m.Sidebar })));
const Canvas = lazy(() => import("@/components/os/canvas").then(m => ({ default: m.Canvas })));

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
        
        <Suspense fallback={null}>
          <Sidebar
            collapsed={collapsed}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            onToggle={() => setCollapsed((v) => !v)}
            onMobileClose={() => setMobileOpen(false)}
            onMobileToolClose={() => mobileOpenerRef.current?.focus()}
          />
        </Suspense>

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
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center bg-transparent">
              <LoaderCircle className="size-5 animate-spin text-white/20" />
            </div>
          }>
            <Canvas />
          </Suspense>
        </div>
      </div>
      <Toaster position="bottom-right" theme="dark" />
    </KnowledgeProvider>
  );
}

function Index() {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <>
      <AmbientBackground />
      {mounted ? (
        <WorkspaceContent 
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          mobileOpenerRef={mobileOpenerRef}
        />
      ) : (
        <div className="flex h-dvh w-full items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-white/10" />
        </div>
      )}
    </>
  );
}