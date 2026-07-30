import { memo, useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Bold, Code, Italic, Strikethrough } from "lucide-react";
import { SlashCommand } from "./slash-command";
import type { JSONContent } from "@/lib/types";

const lowlight = createLowlight(common);

interface Props {
  pageId: string;
  content: JSONContent;
  onChange: (content: JSONContent) => void;
}

/**
 * The editor owns its own document state. We only push JSON upward on a
 * debounce, and the component is memoized on `pageId` so store updates never
 * re-render (and never clobber) the live ProseMirror DOM while typing.
 */
function BlockEditorImpl({ pageId, content, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((json: JSONContent) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeRef.current(json), 400);
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        CodeBlockLowlight.configure({ lowlight }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: "Write, or press '/' for blocks…" }),
        SlashCommand,
      ],
      content,
      editorProps: {
        attributes: { class: "os-prose focus:outline-none min-h-[50vh]" },
      },
      onUpdate: ({ editor }) => push(editor.getJSON() as JSONContent),
    },
    [pageId],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!editor) return <div className="min-h-[50vh]" />;

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
      active ? "bg-violet-500/25 text-violet-200" : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#0d0d11]/90 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <button
            type="button"
            className={btn(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn(editor.isActive("strike"))}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={btn(editor.isActive("code"))}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="h-3.5 w-3.5" />
          </button>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} />
    </>
  );
}

export const BlockEditor = memo(BlockEditorImpl, (prev, next) => prev.pageId === next.pageId);
