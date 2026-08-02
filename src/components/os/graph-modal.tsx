import { Network } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0e0e15] p-6 text-center text-white">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/[0.07]">
          <Network className="size-5 text-violet-200" />
        </div>
        <DialogTitle className="mt-4 text-base font-medium">
          Workspace Map (Disabled for Diagnostic Test)
        </DialogTitle>
        <DialogDescription className="mt-1 text-xs text-white/40">
          React Flow and Dagre are temporarily unlinked to test production build stability.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}