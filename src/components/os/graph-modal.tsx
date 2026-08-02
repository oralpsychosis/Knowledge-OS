import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GraphCanvasProps {
  onClose: () => void;
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
  const [CanvasComponent, setCanvasComponent] = useState<React.ComponentType<GraphCanvasProps> | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    // Strictly load the browser-only React Flow + Dagre module inside useEffect (client-side only)
    import("./graph-canvas").then((module) => {
      if (mounted) {
        setCanvasComponent(() => module.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#0a0a0f] p-2 text-white shadow-2xl">
        <DialogTitle className="sr-only">Workspace Map</DialogTitle>
        {CanvasComponent ? (
          <CanvasComponent onClose={() => onOpenChange(false)} />
        ) : (
          <Fallback />
        )}
      </DialogContent>
    </Dialog>
  );
}