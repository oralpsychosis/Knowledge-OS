import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const CATEGORIES = [
  {
    name: "Midnight Nature",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920",
    ],
  },
  {
    name: "Classic Art",
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1920",
    ],
  },
  {
    name: "Minimal Gradients",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920",
    ],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export function CoverPickerModal({ open, onOpenChange, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-[#0d0d11]/95 p-0 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Cover Gallery</h2>
            <p className="mt-0.5 text-[11px] text-white/35 uppercase tracking-widest">Select an aesthetic preset</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/40 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="os-scroll max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-8">
            {CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/80">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {cat.images.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => {
                        onSelect(url);
                        onOpenChange(false);
                      }}
                      className="group relative aspect-[16/9] overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}