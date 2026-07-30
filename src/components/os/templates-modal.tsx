import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useKnowledge } from "@/store/knowledge";
import type { JSONContent } from "@/lib/types";

const TEMPLATES: Array<{ id: string; label: string; icon: string; desc: string; doc: () => JSONContent }> = [
  {
    id: "adhd",
    label: "ADHD Brain Dump",
    icon: "🧠",
    desc: "Unfiltered capture for scattered thoughts",
    doc: () => ({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Brain Dump" }] },
        { type: "paragraph", content: [{ type: "text", text: "Everything that needs to get out of my head:" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Quick Notes" }] },
        { type: "paragraph" },
        { type: "paragraph" },
      ],
    }),
  },
  {
    id: "project",
    label: "Project Canvas",
    icon: "📋",
    desc: "Goals, milestones, tasks & blockers",
    doc: () => ({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Project Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "Goal: " }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Milestones" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "M1" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "M2" }] }] },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Blockers" }] },
        { type: "paragraph" },
      ],
    }),
  },
  {
    id: "sprint",
    label: "Sprint Board",
    icon: "🏃",
    desc: "This sprint's focus with todo / doing / done",
    doc: () => ({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sprint" }] },
        { type: "paragraph", content: [{ type: "text", text: "Sprint goal:" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "To Do" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "In Progress" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
        ]},
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Done" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph" }] },
        ]},
      ],
    }),
  },
];

export function TemplatesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addPageWithContent } = useKnowledge();

  function apply(template: (typeof TEMPLATES)[0]) {
    addPageWithContent(null, template.label, template.doc());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl">
        <div className="mb-2">
          <h2 className="text-[15px] font-semibold text-white/90">Page Templates</h2>
          <p className="mt-1 text-[12px] text-white/40">Start from a pre-built layout</p>
        </div>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => apply(t)}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-all hover:border-violet-400/30 hover:bg-violet-500/5 hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
            >
              <span className="mt-0.5 text-xl">{t.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-white/80">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-white/40">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
