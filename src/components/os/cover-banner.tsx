import { ImagePlus, Library, X } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { readFileAsDataURL } from "@/lib/storage";
import { CoverPickerModal } from "./cover-picker-modal";

export function CoverBanner({
  cover,
  onChange,
}: {
  cover?: string;
  onChange: (v: string | undefined) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="group relative h-64 w-full overflow-hidden">
      {cover ? (
        <img src={cover} alt="Page cover" className="h-full w-full object-cover" />
      ) : (
        <motion.div
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="h-full w-full bg-[length:200%_200%] bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-fuchsia-600/20"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080A] via-transparent to-transparent" />

      <div className="absolute right-6 top-6 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-xl transition-colors hover:border-violet-400/40 hover:text-white"
        >
          <Library className="h-3.5 w-3.5" />
          Gallery
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-xl transition-colors hover:border-violet-400/40 hover:text-white">
          <ImagePlus className="h-3.5 w-3.5" />
          {cover ? "Upload New" : "Upload Image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) onChange(await readFileAsDataURL(file));
              e.target.value = "";
            }}
          />
        </label>
        {cover && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            title="Remove cover"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 backdrop-blur-xl transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <CoverPickerModal
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={onChange}
      />
    </div>
  );
}