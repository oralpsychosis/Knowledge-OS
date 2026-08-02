import { Camera, FileText, Smile } from "lucide-react";
import { useState } from "react";
import { readFileAsDataURL } from "@/lib/storage";
import { IconPickerModal } from "./icon-picker-modal";

export function PageAvatar({
  avatar,
  icon,
  onAvatarChange,
  onIconChange,
}: {
  avatar?: string;
  icon?: string;
  onAvatarChange: (v: string | undefined) => void;
  onIconChange: (v: string | undefined) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="group relative -mt-12 ml-8 h-24 w-24">
      <div className="h-full w-full overflow-hidden rounded-2xl border-4 border-[#08080A] bg-[#0d0d11] shadow-2xl shadow-black/60">
        {avatar ? (
          <img src={avatar} alt="Page avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-4xl">
            {icon ?? <FileText className="h-8 w-8 text-violet-200/70" />}
          </span>
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-2xl bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          title="Pick emoji"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/90 transition-colors hover:bg-violet-500/40"
        >
          <Smile className="h-4 w-4" />
        </button>

        <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white/90 transition-colors hover:bg-violet-500/40">
          <Camera className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                onAvatarChange(await readFileAsDataURL(file));
                onIconChange(undefined); // Clear emoji if image is uploaded
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <IconPickerModal
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={(emoji) => {
          onIconChange(emoji);
          onAvatarChange(undefined); // Clear image if emoji is picked
        }}
      />
    </div>
  );
}