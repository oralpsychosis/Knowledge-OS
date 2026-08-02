import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Waypoints } from "lucide-react";

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/10 bg-[#0a0a0f] p-8 text-center text-white shadow-2xl">
        <DialogTitle className="sr-only">Workspace Map Diagnostic</DialogTitle>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15">
          <Waypoints className="size-6 text-violet-300" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white/90">Workspace Map</h3>
        <p className="mt-2 text-xs text-white/45">
          Testing diagnostic mode: React Flow is disabled to verify workspace stability.
        </p>
      </DialogContent>
    </Dialog>
  );
}