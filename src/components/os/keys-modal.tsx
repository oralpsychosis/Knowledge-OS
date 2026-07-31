import { Dialog, DialogContent } from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: "Ctrl / ⌘ K", label: "Quick search" },
  { keys: "/", label: "Open block menu" },
  { keys: "Ctrl / ⌘ B", label: "Bold" },
  { keys: "Ctrl / ⌘ I", label: "Italic" },
  { keys: "Ctrl / ⌘ Z", label: "Undo" },
  { keys: "Ctrl / ⌘ ⇧ Z", label: "Redo" },
  { keys: "Esc", label: "Close dialogs" },
];

export function KeysModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-[#111116] shadow-2xl">
        <h2 className="text-[15px] font-semibold text-white/90">Keyboard shortcuts</h2>
        <p className="mb-3 mt-1 text-[12px] text-white/40">Move quickly without leaving the page</p>
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
