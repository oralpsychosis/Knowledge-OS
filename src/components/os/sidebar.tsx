import { motion } from "motion/react";
import {
  ChevronDown,
  CloudCheck,
  CloudUpload,
  FileText,
  Hexagon,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
} from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import { PageTree } from "./page-tree";
import { FocusAudio } from "./focus-audio";
import { ActionBar } from "./action-bar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { addPage, addWhiteboard, select, state, syncing } = useKnowledge();
  const auth = useAuth();
  const onHome = state.activePageId === null;

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 280 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      className="relative flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-xl"
    >
      <div className="flex items-start gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-indigo-500/40 to-violet-500/30 shadow-[0_0_18px_rgba(139,92,246,0.25)]">
          <Hexagon className="h-4 w-4 text-violet-200" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h1 className="truncate text-[13px] font-semibold tracking-[0.14em] text-white/90">
                KNOWLEDGE OS
              </h1>
              {auth.user && (
                <div className="flex items-center gap-1">
                  {syncing ? (
                    <CloudUpload className="h-3 w-3 text-violet-400 animate-pulse" />
                  ) : (
                    <CloudCheck className="h-3 w-3 text-emerald-400/60" />
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <motion.span
                animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
              />
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {auth.user ? "Cloud Sync Active" : "Local engine online"}
              </span>
            </div>
          </div>
        )}
      </div>

      {auth.user ? (
        <div className="flex items-center gap-2 border-b border-white/5 px-4 pb-3 mb-2">
          <img
            src={auth.user.user_metadata?.avatar_url ?? ""}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover"
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white/80">
                {auth.user.user_metadata?.full_name ?? auth.user.email}
              </p>
              <button
                onClick={auth.signOut}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : supabase && !collapsed ? (
        <div className="px-3 pb-2">
          <button
            onClick={auth.signIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {!collapsed && <span>Sign in with Google</span>}
          </button>
        </div>
      ) : null}

      <div className="px-3">
        {collapsed ? (
          <motion.button
            type="button"
            title="New page"
            onClick={() => addPage(null)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex w-full items-center justify-center rounded-xl border border-violet-400/30 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 py-2 text-violet-100 transition-shadow hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        ) : (
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex overflow-hidden rounded-xl border border-violet-400/30 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 transition-shadow hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            <button
              type="button"
              onClick={() => addPage(null)}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 py-2 text-[13px] font-medium text-violet-100"
            >
              <Plus className="h-4 w-4" />
              <span>New Page</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Choose page type"
                  aria-label="Choose page type"
                  className="flex w-10 items-center justify-center border-l border-violet-300/15 text-violet-200/65 transition-colors hover:bg-white/[0.06] hover:text-violet-100"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={7}
                className="w-52 border-white/10 bg-[#171720]/95 p-1.5 text-white/70 shadow-2xl backdrop-blur-xl"
              >
                <DropdownMenuItem
                  onSelect={() => addPage(null)}
                  className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.07] focus:text-white"
                >
                  <FileText />
                  <span>
                    <span className="block">Document</span>
                    <span className="mt-0.5 block text-[10px] text-white/35">
                      Write with blocks
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => addWhiteboard(null)}
                  className="rounded-lg px-2.5 py-2 text-xs focus:bg-violet-500/15 focus:text-violet-100"
                >
                  <PenLine />
                  <span>
                    <span className="block">Whiteboard</span>
                    <span className="mt-0.5 block text-[10px] text-white/35">
                      Draw ideas and flows
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </div>

      <div className="px-3 pt-3">
        <ActionBar />
      </div>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => select(null)}
          title="Homepage"
          className={`os-glow-hover flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-[13px] ${
            onHome
              ? "os-glow-active border-white/10 bg-white/[0.06] text-white"
              : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Homepage</span>}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-4 pb-2 pt-6 text-[10px] uppercase tracking-[0.2em] text-white/25">
            Workspace
          </div>
          <div className="os-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-6">
            <PageTree />
          </div>
        </>
      )}

      {!collapsed && (
        <div className="border-t border-white/10 p-1.5">
          <FocusAudio />
        </div>
      )}

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-widest">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
