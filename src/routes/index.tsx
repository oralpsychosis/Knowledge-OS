import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { LoaderCircle, PanelLeftOpen } from "lucide-react";
import { KnowledgeProvider } from "@/store/knowledge";
import { AmbientBackground } from "@/components/os/ambient-background";
import { Toaster } from "@/components/ui/sonner";

// Lazy load the main workspace surfaces to keep SSR lightweight
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

  function openMobileSidebar() {
    setMobileOpen(true);
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  return (
    <KnowledgeProvider>
      <AmbientBackground />
      <div className="relative flex h-dvh w-full overflow-hidden text-white antialiased">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Dismiss sidebar"
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          />
        )}
        
        <Suspense fallback={null}>
          <Sidebar
            collapsed={collapsed}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            onToggle={() => setCollapsed((v) => !v)}
            onMobileClose={() => closeMobileSidebar()}
            onMobileToolClose={() => mobileOpenerRef.current?.focus()}
          />
        </Suspense>

        {!mobileOpen && (
          <button
            ref={mobileOpenerRef}
            type="button"
            aria-label="Open sidebar"
            onClick={openMobileSidebar}
            className="fixed left-3 top-3 z-30 flex size-10 items-center justify-center rounded-xl border border-white/[0.09] bg-[#111118]/94 text-white/65 shadow-lg md:hidden"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center bg-[#08080a]">
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