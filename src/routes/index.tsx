import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { KnowledgeProvider } from "@/store/knowledge";
import { Sidebar } from "@/components/os/sidebar";
import { Canvas } from "@/components/os/canvas";
import { AmbientBackground } from "@/components/os/ambient-background";
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
    ],
  }),
  component: Index,
});

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Default to false for SSR
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenerRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMobile = useRef(false);
  const shouldRestoreMobileFocus = useRef(false);

  // Use a second effect to detect mobile safely after hydration
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setMobileOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobile, mobileOpen]);

  function openMobileSidebar() {
    hasOpenedMobile.current = true;
    setMobileOpen(true);
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  function focusMobileOpener() {
    requestAnimationFrame(() => mobileOpenerRef.current?.focus());
  }

  return (
    <KnowledgeProvider>
      <AmbientBackground />
      <div className="relative flex h-dvh w-full overflow-hidden text-white antialiased">
        {/* Scrim: Only rendered if mobileOpen is true */}
        {mobileOpen && (
          <button
            type="button"
            aria-label="Dismiss sidebar"
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          />
        )}
        
        {/* 
          Critical fix for hydration: We always render the Sidebar but control its 
          mobile visibility via CSS classes rather than conditional JS to avoid 
          mismatches between server-rendered HTML and client hydration.
        */}
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((v) => !v)}
          onMobileClose={() => closeMobileSidebar()}
          onMobileToolClose={focusMobileOpener}
        />

        {/* Mobile Opener: Hidden on desktop via md:hidden */}
        {!mobileOpen && (
          <button
            ref={mobileOpenerRef}
            type="button"
            aria-label="Open sidebar"
            onClick={openMobileSidebar}
            className="fixed left-3 top-3 z-30 flex size-10 items-center justify-center rounded-xl border border-white/[0.09] bg-[#111118]/94 text-white/65 shadow-lg outline-none md:hidden"
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