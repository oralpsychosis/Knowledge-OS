import { Camera, FileText } from "lucide-react";
import { readFileAsDataURL } from "@/lib/storage";

export function PageAvatar({
  avatar,
  icon,
  onChange,
}: {
  avatar?: string;
  icon?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="group relative -mt-12 ml-8 block h-24 w-24 cursor-pointer overflow-hidden rounded-2xl border-4 border-[#08080A] bg-[#0d0d11] shadow-2xl shadow-black/60">
      {avatar ? (
        <img src={avatar} alt="Page avatar" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-2xl">
          {icon ?? <FileText className="h-7 w-7 text-violet-200/70" />}
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
        <Camera className="h-5 w-5 text-white/90" />
      </span>
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
  );
}
