import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  CloudCheck,
  CloudUpload,
  Ellipsis,
  FileText,
  Home,
  Keyboard,
  LayoutTemplate,
  LogIn,
  LogOut,
  PanelLeftClose,
  PenLine,
  Plus,
  Search,
  Waypoints,
  X,
} from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FocusAudio } from "./focus-audio";
import { PageTree } from "./page-tree";
import { SearchModal } from "./search-modal";
import { TemplatesModal } from "./templates-modal";
import { GraphModal } from "./graph-modal";
import { KeysModal } from "./keys-modal";

type SidebarTool = "search" | "templates" | "map" | "shortcuts" | null;

interface SidebarProps {
  collapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: (restoreFocus?: boolean) => void;
  onMobileToolClose: () => void;
}

const navButtonClass =
  "flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] transition-colors";

export function Sidebar({
  collapsed,
  isMobile,
  mobileOpen,
  onToggle,
  onMobileClose,
  onMobileToolClose,
}: SidebarProps) {
  const { addPage, addWhiteboard, select, state, syncing } = useKnowledge();
  const auth = useAuth();
  const [activeTool, setActiveTool] = useState<SidebarTool>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const rail = collapsed && !isMobile;
  const onHome = state.activePageId === null;

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveTool((current) => (current === "search" ? null : "search"));
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (isMobile && mobileOpen) mobileCloseRef.current?.focus();
  }, [isMobile, mobileOpen]);

  function finishNavigation() {
    if (isMobile) onMobileClose(false);
  }

  function createDocument() {
    addPage(null);
    finishNavigation();
  }

  function createWhiteboard() {
    addWhiteboard(null);
    finishNavigation();
  }

  function openTool(tool: Exclude<SidebarTool, null>) {
    setActiveTool(tool);
    finishNavigation();
  }

  function closeTool() {
    setActiveTool(null);
    if (isMobile) onMobileToolClose();
  }

  function goHome() {
    select(null);
    finishNavigation();
  }

  const asideWidth = isMobile ? 288 : rail ? 56 : 264;

  return (
    <TooltipProvider delayDuration={320}>
      <motion.aside
        animate={{
          width: asideWidth,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        aria-hidden={isMobile && !mobileOpen}
        aria-label={isMobile ? "Workspace navigation" : undefined}
        aria-modal={isMobile && mobileOpen ? true : undefined}
        data-mobile-open={mobileOpen}
        inert={isMobile && !mobileOpen ? true : undefined}
        role={isMobile ? "dialog" : undefined}
        className={`knowledge-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-w-[86vw] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-white/[0.08] bg-[#0b0b0f]/98 text-white shadow-2xl shadow-black/50 transition-transform duration-200 ease-out motion-reduce:transition-none md:relative md:inset-auto md:z-20 md:h-full md:max-w-none md:overflow-hidden md:shadow-none [@media(max-height:520px)]:overflow-y-auto ${
          mobileOpen ? "" : "pointer-events-none md:pointer-events-auto"
        }`}
      >
        {rail ? (
          <RailHeader onExpand={onToggle} />
        ) : (
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-3.5">
            <img
              src="/brand/knowledge-os-logo-on-dark.svg"
              alt=""
              aria-hidden="true"
              className="size-8 shrink-0 object-contain"
            />
            <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.02em] text-white/90">
              Knowledge OS
            </h1>
            {auth.user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex size-7 items-center justify-center rounded-md text-white/35"
                    aria-label={syncing ? "Syncing workspace" : "Workspace synced"}
                  >
                    {syncing ? (
                      <CloudUpload className="size-3.5 animate-pulse text-violet-300/80" />
                    ) : (
                      <CloudCheck className="size-3.5 text-emerald-300/55" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {syncing ? "Syncing" : "Workspace synced"}
                </TooltipContent>
              </Tooltip>
            )}
            {isMobile && (
              <button
                ref={mobileCloseRef}
                type="button"
                onClick={() => onMobileClose()}
                aria-label="Close sidebar"
                className="flex size-9 items-center justify-center rounded-lg text-white/45 outline-none transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:ring-1 focus-visible:ring-violet-300/55"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {rail ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 px-2 pb-2">
            <RailButton label="New page" onClick={createDocument}>
              <Plus className="size-4" />
            </RailButton>
            <RailButton label="Home" active={onHome} onClick={goHome}>
              <Home className="size-4" />
            </RailButton>
            <RailButton label="Search" onClick={() => openTool("search")}>
              <Search className="size-4" />
            </RailButton>
            <RailButton label="Workspace map" onClick={() => openTool("map")}>
              <Waypoints className="size-4" />
            </RailButton>
            <RailMoreMenu
              auth={auth}
              onTemplates={() => openTool("templates")}
              onShortcuts={() => openTool("shortcuts")}
            />
            <div className="min-h-2 flex-1" />
          </div>
        ) : (
          <>
            <div className="shrink-0 px-3">
              <div className="flex h-9 overflow-hidden rounded-lg border border-violet-300/15 bg-violet-400/[0.09] text-violet-100">
                <button
                  type="button"
                  onClick={createDocument}
                  className="flex min-w-0 flex-1 items-center justify-center gap-2 text-[13px] font-medium transition-colors hover:bg-violet-300/[0.07]"
                >
                  <Plus className="size-4" />
                  New page
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Choose how to create a page"
                      className="flex w-10 items-center justify-center border-l border-violet-300/15 text-violet-200/60 transition-colors hover:bg-violet-300/[0.07] hover:text-violet-100"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={7}
                    collisionPadding={12}
                    className="z-[70] w-56 border-white/10 bg-[#15151b] p-1.5 text-white/70 shadow-2xl"
                  >
                    <DropdownMenuLabel className="px-2.5 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">
                      Create
                    </DropdownMenuLabel>
                    <CreationMenuItem
                      icon={<FileText />}
                      label="Document"
                      description="Start writing immediately"
                      onSelect={createDocument}
                    />
                    <CreationMenuItem
                      icon={<PenLine />}
                      label="Whiteboard"
                      description="Draw ideas and flows"
                      onSelect={createWhiteboard}
                    />
                    <DropdownMenuSeparator className="bg-white/[0.07]" />
                    <CreationMenuItem
                      icon={<LayoutTemplate />}
                      label="From a template..."
                      description="Brain dump, project or sprint"
                      onSelect={() => openTool("templates")}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <nav className="shrink-0 px-3 pt-3" aria-label="Workspace navigation">
              <button
                type="button"
                onClick={() => openTool("search")}
                className={`${navButtonClass} text-white/48 hover:bg-white/[0.045] hover:text-white/80`}
              >
                <Search className="size-4 shrink-0" />
                <span>Search</span>
                <kbd className="ml-auto rounded border border-white/[0.08] bg-white/[0.025] px-1.5 py-0.5 text-[10px] text-white/28">
                  Ctrl K
                </kbd>
              </button>
              <button
                type="button"
                onClick={goHome}
                className={`${navButtonClass} mt-0.5 ${
                  onHome
                    ? "bg-white/[0.065] text-white/92"
                    : "text-white/48 hover:bg-white/[0.045] hover:text-white/80"
                }`}
              >
                <Home className="size-4 shrink-0" />
                <span>Home</span>
              </button>
              <button
                type="button"
                onClick={() => openTool("map")}
                className={`${navButtonClass} mt-0.5 text-white/48 hover:bg-white/[0.045] hover:text-white/80`}
              >
                <Waypoints className="size-4 shrink-0" />
                <span>Map</span>
              </button>
            </nav>

            <div className="flex items-center justify-between px-4 pb-2 pt-5">
              <span className="text-[10px] font-medium uppercase tracking-[0.13em] text-white/25">
                Pages
              </span>
            </div>
            <div className="os-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              <PageTree onNavigate={finishNavigation} />
            </div>
          </>
        )}

        <div
          className={
            rail
              ? "flex shrink-0 flex-col items-center gap-1 px-2 pb-2"
              : "shrink-0 border-t border-white/[0.07] bg-[#0b0b0f]"
          }
        >
          <div className={rail ? "w-full" : "p-1.5 pb-0"}>
            <FocusAudio collapsed={rail} />
          </div>
          {!rail && (
            <div className="mt-1.5 flex items-center gap-1 border-t border-white/[0.06] p-2">
              <ExpandedMoreMenu auth={auth} onShortcuts={() => openTool("shortcuts")} />
              {!isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onToggle}
                      aria-label="Collapse sidebar"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white/75"
                    >
                      <PanelLeftClose className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Collapse sidebar</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {activeTool === "search" && <SearchModal open={true} onOpenChange={(open) => !open && closeTool()} />}
      {activeTool === "templates" && <TemplatesModal open={true} onOpenChange={(open) => !open && closeTool()} />}
      {activeTool === "map" && <GraphModal open={true} onOpenChange={(open) => !open && closeTool()} />}
      {activeTool === "shortcuts" && <KeysModal open={true} onOpenChange={(open) => !open && closeTool()} />}
    </TooltipProvider>
  );
}

function RailHeader({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand sidebar"
            className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.05]"
          >
            <img
              src="/brand/knowledge-os-logo-on-dark.svg"
              alt=""
              aria-hidden="true"
              className="size-7 object-contain"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>
    </div>
  );
}

function RailButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active
              ? "bg-violet-400/12 text-violet-100"
              : "text-white/38 hover:bg-white/[0.055] hover:text-white/78"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function CreationMenuItem({
  icon,
  label,
  description,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
    >
      {icon}
      <span>
        <span className="block text-white/80">{label}</span>
        <span className="mt-0.5 block text-[10px] text-white/32">{description}</span>
      </span>
    </DropdownMenuItem>
  );
}

type AuthValue = ReturnType<typeof useAuth>;

function RailMoreMenu({
  auth,
  onTemplates,
  onShortcuts,
}: {
  auth: AuthValue;
  onTemplates: () => void;
  onShortcuts: () => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More workspace tools"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white/38 transition-colors hover:bg-white/[0.055] hover:text-white/78"
            >
              <Ellipsis className="size-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">More</TooltipContent>
      </Tooltip>
      <WorkspaceMenuContent
        side="right"
        auth={auth}
        onTemplates={onTemplates}
        onShortcuts={onShortcuts}
      />
    </DropdownMenu>
  );
}

function ExpandedMoreMenu({ auth, onShortcuts }: { auth: AuthValue; onShortcuts: () => void }) {
  const displayName = auth.user?.user_metadata?.full_name ?? auth.user?.email ?? "More";
  const avatar = auth.user?.user_metadata?.avatar_url as string | undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-[12px] text-white/42 transition-colors hover:bg-white/[0.05] hover:text-white/75"
        >
          {avatar ? (
            <img src={avatar} alt="" className="size-5 shrink-0 rounded-md object-cover" />
          ) : (
            <Ellipsis className="size-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">{displayName}</span>
          <ChevronDown className="size-3.5 shrink-0 text-white/25" />
        </button>
      </DropdownMenuTrigger>
      <WorkspaceMenuContent side="top" auth={auth} onShortcuts={onShortcuts} />
    </DropdownMenu>
  );
}

function WorkspaceMenuContent({
  side,
  auth,
  onTemplates,
  onShortcuts,
}: {
  side: "right" | "top";
  auth: AuthValue;
  onTemplates?: () => void;
  onShortcuts: () => void;
}) {
  return (
    <DropdownMenuContent
      side={side}
      align="start"
      sideOffset={8}
      collisionPadding={12}
      className="z-[70] w-56 border-white/10 bg-[#15151b] p-1.5 text-white/70 shadow-2xl"
    >
      <DropdownMenuLabel className="px-2.5 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">
        Workspace
      </DropdownMenuLabel>
      {onTemplates && (
        <DropdownMenuItem
          onSelect={onTemplates}
          className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
        >
          <LayoutTemplate />
          From a template...
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={onShortcuts}
        className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
      >
        <Keyboard />
        Keyboard shortcuts
      </DropdownMenuItem>
      {supabase && <DropdownMenuSeparator className="bg-white/[0.07]" />}
      {auth.user ? (
        <DropdownMenuItem
          onSelect={auth.signOut}
          className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      ) : supabase ? (
        <DropdownMenuItem
          onSelect={auth.signIn}
          className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
        >
          <LogIn />
          Sign in with Google
        </DropdownMenuItem>
      ) : null}
    </DropdownMenuContent>
  );
}