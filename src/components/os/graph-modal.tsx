import { lazy, Suspense } from "react";
import { LoaderCircle, Waypoints } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ClientOnly } from "./client-only";

const GraphCanvas = lazy(() => import("./graph-canvas"));

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Fallback() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-3 bg-[#08080c] text-white/40">
      <LoaderCircle className="size-6 animate-spin text-violet-400" />
      <span className="text-xs uppercase tracking-widest">Loading workspace map...</span>
    </div>
  );
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#0a0a0f] p-2 text-white shadow-2xl">
        <DialogTitle className="sr-only">Workspace Map</DialogTitle>
        <ClientOnly fallback={<Fallback />}>
          <Suspense fallback={<Fallback />}>
            <GraphCanvas onClose={() => onOpenChange(false)} />
          </Suspense>
        </ClientOnly>
      </DialogContent>
    </Dialog>
  );
}