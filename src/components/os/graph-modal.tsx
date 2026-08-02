import { useEffect, useState, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const GraphCanvas = lazy(() => import("./graph-canvas"));

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#0a0a0f] p-4 text-white shadow-2xl">
        <DialogTitle className="sr-only">Workspace Map</DialogTitle>
        {mounted && open ? (
          <Suspense
            fallback={
              <div className="flex h-[80vh] w-full items-center justify-center rounded-2xl bg-[#08080c]">
                <Loader2 className="size-8 animate-spin text-violet-400" />
              </div>
            }
          >
            <GraphCanvas onClose={() => onOpenChange(false)} />
          </Suspense>
        ) : (
          <div className="h-[80vh] w-full" />
        )}
      </DialogContent>
    </Dialog>
  );
}