import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { KnowledgeProvider } from "@/store/knowledge";
import { Sidebar } from "@/components/os/sidebar";
import { Canvas } from "@/components/os/canvas";
import { AmbientBackground } from "@/components/os/ambient-background";

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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenerRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMobile = useRef(false);
  const shouldRestoreMobileFocus = useRef(false);

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

      const target = event.target instanceof HTMLElement ? event.target : null;
      const drawer = document.querySelector('aside[role="dialog"]');
      const activeOverlay = target?.closest('[role="menu"], [role="dialog"]');
      if (activeOverlay && activeOverlay !== drawer) return;

      shouldRestoreMobileFocus.current = true;
      setMobileOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (!isMobile || mobileOpen || !hasOpenedMobile.current) return;
    if (!shouldRestoreMobileFocus.current) return;

    shouldRestoreMobileFocus.current = false;
    const frame = requestAnimationFrame(() => mobileOpenerRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isMobile, mobileOpen]);

  function openMobileSidebar() {
    hasOpenedMobile.current = true;
    shouldRestoreMobileFocus.current = false;
    setMobileOpen(true);
  }

  function closeMobileSidebar(restoreFocus = true) {
    shouldRestoreMobileFocus.current = restoreFocus;
    setMobileOpen(false);
  }

  function focusMobileOpener() {
    requestAnimationFrame(() => mobileOpenerRef.current?.focus());
  }

  return (
    <KnowledgeProvider>
      <AmbientBackground />
      <div className="relative flex h-dvh w-full overflow-hidden text-white antialiased">
        {isMobile && mobileOpen && (
          <button
            type="button"
            aria-label="Dismiss sidebar"
            onClick={() => closeMobileSidebar()}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          />
        )}
        {isMobile && !mobileOpen && (
          <button
            ref={mobileOpenerRef}
            type="button"
            aria-label="Open sidebar"
            onClick={openMobileSidebar}
            className="fixed left-3 top-3 z-30 flex size-10 items-center justify-center rounded-xl border border-white/[0.09] bg-[#111118]/94 text-white/65 shadow-lg shadow-black/30 outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-violet-300/55 md:hidden"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((value) => !value)}
          onMobileClose={closeMobileSidebar}
          onMobileToolClose={focusMobileOpener}
        />
        <div
          inert={isMobile && mobileOpen ? true : undefined}
          className="flex min-w-0 flex-1 overflow-hidden"
        >
          <Canvas />
        </div>
      </div>
    </KnowledgeProvider>
  );
}
