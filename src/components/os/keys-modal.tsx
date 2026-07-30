import { Dialog, DialogContent } from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: "⌘K", label: "Quick Search" },
  { keys: "⌘N", label: "New Page" },
  { keys: "⌘S", label: "Save / Sync" },
  { keys: "⌘Z", label: "Undo" },
  { keys: "⌘⇧Z", label: "Redo" },
  { keys: "⌘B", label: "Bold" },
  { keys: "⌘I", label: "Italic" },
  { keys: "⌘⇧K", label: "Toggle Sidebar" },
  { keys: "Esc", label: "Close Modals" },
  { keys: "/", label: "Slash Commands" },
];

export function KeysModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl">
        <h2 className="text-[15px] font-semibold text-white/90">Keyboard Shortcuts</h2>
        <p className="mb-3 mt-1 text-[12px] text-white/40">Power-up your workflow</p>
        <div className="flex flex-col gap-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]"
            >
              <span className="text-white/60">{s.label}</span>
              <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/40">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
