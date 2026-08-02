import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const EMOJI_GROUPS = [
  {
    name: "Essentials",
    emojis: ["✨", "📝", "📌", "📅", "🚀", "💡", "🎯", "🔥", "🌈", "✅"],
  },
  {
    name: "Work",
    emojis: ["💻", "📊", "📁", "📎", "🛠️", "🏗️", "📚", "🖊️", "🎓", "🧠"],
  },
  {
    name: "Objects",
    emojis: ["🏠", "🚗", "🚲", "🎨", "🎭", "🎮", "📷", "🔋", "🔑", "🎁"],
  },
  {
    name: "Nature & Animals",
    emojis: ["🌿", "🌸", "🌙", "☀️", "🌊", "🍄", "🐱", "🐶", "🦊", "🦋"],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

export function IconPickerModal({ open, onOpenChange, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-[#0d0d11]/95 p-0 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-[14px] font-semibold text-white/90">Pick an icon</h2>
            <p className="mt-0.5 text-[10px] text-white/35 uppercase tracking-widest">Select an emoji</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/40 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="os-scroll max-h-[50vh] overflow-y-auto p-5">
          <div className="space-y-6">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.name}>
                <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-violet-400/70">
                  {group.name}
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onSelect(emoji);
                        onOpenChange(false);
                      }}
                      className="flex aspect-square items-center justify-center rounded-xl border border-white/5 bg-white/5 text-xl transition-all hover:scale-110 hover:border-violet-500/40 hover:bg-violet-500/10"
                    >
                      {emoji}
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