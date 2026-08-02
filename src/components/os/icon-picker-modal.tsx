import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

export function IconPickerModal({ open, onOpenChange, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] overflow-hidden border-white/10 bg-[#0d0d11]/95 p-0 shadow-2xl backdrop-blur-2xl">
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

        <div className="flex items-center justify-center p-2">
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.APPLE}
            lazyLoadEmojis={true}
            onEmojiClick={(emojiData) => {
              onSelect(emojiData.emoji);
              onOpenChange(false);
            }}
            width="100%"
            height={400}
            searchPlaceholder="Search emojis..."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}