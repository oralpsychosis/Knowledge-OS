import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Type,
  type LucideIcon,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface Item {
  title: string;
  hint: string;
  icon: LucideIcon;
  keywords?: string;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: Item[] = [
  {
    title: "Text",
    hint: "Plain paragraph",
    icon: Type,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode("paragraph").run(),
  },
  {
    title: "Heading 1",
    hint: "Big section title",
    icon: Heading1,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    hint: "Section title",
    icon: Heading2,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    hint: "Subsection",
    icon: Heading3,
    run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    hint: "Unordered list",
    icon: List,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    hint: "Ordered list",
    icon: ListOrdered,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    title: "To-do",
    hint: "Checkable task",
    keywords: "todo checklist check",
    icon: ListTodo,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    title: "Code block",
    hint: "Syntax highlighted",
    icon: Code2,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    title: "Quote",
    hint: "Callout line",
    icon: Quote,
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    title: "Divider",
    hint: "Horizontal rule",
    icon: Minus,
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

interface ListProps {
  items: Item[];
  command: (item: Item) => void;
}

const SlashList = forwardRef<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean }, ListProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);
    const prevSelected = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSelected(0), [items]);

    useEffect(() => {
      if (items.length === 0) return;
      const prev = prevSelected.current;
      prevSelected.current = selected;
      const container = scrollRef.current;
      if (!container) return;

      const isLast = selected === items.length - 1;
      const isFirst = selected === 0;
      const wasLast = prev === items.length - 1;
      const wasFirst = prev === 0;

      // Wrap from bottom to top
      if (wasLast && isFirst) {
        container.scrollTop = 0;
        return;
      }
      // Wrap from top to bottom
      if (wasFirst && isLast) {
        container.scrollTop = container.scrollHeight;
        return;
      }

      const itemEl = container.querySelector(`[data-slash-index="${selected}"]`);
      if (itemEl) {
        itemEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [selected]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selected]) command(items[selected]);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) return null;

    return (
      <div className="w-[268px] overflow-hidden rounded-xl border border-white/10 bg-[#0d0d11]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
          Blocks
        </div>
        <div ref={scrollRef} className="max-h-[280px] overflow-y-auto os-scroll">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                data-slash-index={i}
                type="button"
                onMouseEnter={() => setSelected(i)}
                onClick={() => command(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  i === selected ? "bg-violet-500/15 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 ${
                    i === selected ? "bg-violet-500/20 text-violet-200" : "bg-white/5"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{item.title}</span>
                  <span className="block truncate text-[11px] text-white/35">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
SlashList.displayName = "SlashList";

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: Item;
        }) => props.run(editor, range),
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!q) return ITEMS;
          return ITEMS.filter((i) => {
            const hay = (i.title + " " + i.hint + " " + (i.keywords ?? "")).toLowerCase().replace(/[^a-z0-9]/g, "");
            return hay.includes(q);
          }).slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer<
            { onKeyDown: (p: { event: KeyboardEvent }) => boolean },
            ListProps
          > | null = null;
          let wrapper: HTMLDivElement | null = null;

          const position = (rect: DOMRect | null) => {
            if (!wrapper || !rect) return;
            const height = wrapper.offsetHeight || 300;
            const top =
              rect.bottom + height + 12 > window.innerHeight ? rect.top - height - 8 : rect.bottom + 8;
            wrapper.style.top = `${Math.max(8, top)}px`;
            wrapper.style.left = `${Math.min(rect.left, window.innerWidth - 288)}px`;
          };

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashList, { props, editor: props.editor });
              wrapper = document.createElement("div");
              wrapper.style.position = "fixed";
              wrapper.style.zIndex = "60";
              wrapper.appendChild(component.element);
              document.body.appendChild(wrapper);
              position(props.clientRect?.());
            },
            onUpdate: (props: any) => {
              component?.updateProps(props);
              position(props.clientRect?.());
            },
            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") {
                wrapper?.remove();
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              wrapper?.remove();
              wrapper = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
