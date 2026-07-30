import { useEffect, useRef } from "react";

export function EditableTitle({
  pageId,
  value,
  onChange,
  autoFocus,
}: {
  pageId: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    grow();
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  useEffect(grow, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder="Untitled"
      spellCheck={false}
      onChange={(e) => {
        onChange(e.target.value.replace(/\n/g, ""));
        grow();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      className="w-full resize-none overflow-hidden border-0 bg-transparent text-4xl font-bold tracking-tight text-white outline-none placeholder:text-white/20 focus:outline-none md:text-5xl"
    />
  );
}
