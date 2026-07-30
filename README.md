# Thought Stream

# KNOWLEDGE OS — Master Build Prompt for Lovable

Copy everything below the line into Lovable as your build prompt.

---

## PROJECT: Knowledge OS

Build a production-grade, block-based knowledge workspace called **Knowledge OS**. This is a Notion-style page engine skinned as a premium dark-tech desktop operating system — think Linear, Raycast, Arc Browser, and Vercel's dashboard had a child. It must feel like a $10,000 native app, not a web form. This app is designed for a user with ADHD, so the single most important design principle is: **zero friction between having a thought and capturing it.** No popups. No modals. No forced structure. Ever.

### NON-NEGOTIABLE ANTI-PATTERNS (things that will cause immediate rejection)

- ❌ NO sticky-note/card-grid layouts
- ❌ NO required tags, categories, folders, or metadata of any kind
- ❌ NO `window.prompt()`, `window.confirm()`, or any native browser popup for text input
- ❌ NO "paste an image URL" fields for covers or avatars — every image input MUST use a real `<input type="file" accept="image/*">` that opens the OS-native file picker, with the result read via `FileReader` → base64 DataURL (or `URL.createObjectURL`) and persisted
- ❌ NO modal dialogs for core editing actions (title edit, block edit) — everything is inline, in-canvas, click-to-edit

### TECH STACK

- React + TypeScript
- Tailwind CSS
- Framer Motion (all transitions/micro-interactions)
- Lucide React (icons only — no other icon sets)
- A real block/rich-text editor library: **Tiptap** (preferred, via `@tiptap/react`, `@tiptap/starter-kit`, plus extensions for task lists, code blocks with lowlight syntax highlighting, and a slash-command extension). If Tiptap setup proves unstable in this environment, BlockNote is an acceptable fallback — but it must still support slash commands, nested lists, checkable to-dos, and code blocks.
- LocalStorage for persistence (structured as a normalized JSON tree — see Data Model below). Wrap all reads/writes in a small persistence utility (`lib/storage.ts`) so it can be swapped for a real backend later without touching components.

---

## DATA MODEL

Store everything as a flat map of pages keyed by ID, plus a root order array — this makes nesting, moving, and deleting cheap.

```ts
interface KnowledgePage {
  id: string;              // uuid
  title: string;           // "" allowed, shows "Untitled" placeholder
  icon?: string;           // emoji or lucide icon key, user-set, optional
  coverImage?: string;     // DataURL, optional
  avatarImage?: string;    // DataURL, optional
  parentId: string | null; // null = root-level page
  childrenIds: string[];   // ordered
  content: JSONContent;    // Tiptap/BlockNote document JSON
  createdAt: number;
  updatedAt: number;
}

interface KnowledgeOSState {
  pages: Record<string, KnowledgePage>;
  rootOrder: string[];
  activePageId: string | null;
}
```

Persist the entire `KnowledgeOSState` under a single LocalStorage key (`knowledge-os-state`), debounce-saved (300–500ms) on every mutation. Load it on boot; if empty, seed with one welcome page demonstrating the block types (heading, paragraph, a checklist, a code block) so the canvas is never empty on first load.

---

## LAYOUT — TWO-PANE APP SHELL

Full-height (`h-screen`), no page scroll — internal panes scroll independently.

### A. SIDEBAR (fixed width ~280px, collapsible to icon-rail)

- Background: glassmorphic panel — `bg-black/40 backdrop-blur-xl border-r border-white/10`
- **Header row**: small square logo mark + wordmark "KNOWLEDGE OS", and directly beneath it a status line: a **pulsing green dot** (animate with Framer Motion `scale`/`opacity` loop, `bg-emerald-400` with a soft `shadow-[0_0_8px]` glow) followed by the label `LOCAL ENGINE ONLINE` in small uppercase tracked-out text (`text-[10px] tracking-widest text-white/40`).
- **"+ New Page" button**: full-width, prominent, sits right under the header. On click: creates a new `KnowledgePage` with empty title, inserts it into `rootOrder` (or as a child if a page is currently selected/hovered — see below), sets it as `activePageId`, and immediately focuses the title input in the main canvas (use a ref + `useEffect` keyed on `activePageId` to auto-focus). Style: indigo/violet gradient background at low opacity with a glowing border, `hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]`, spring scale on press (Framer Motion `whileTap={{scale:0.97}}`).
- **Page tree**: recursive component rendering `rootOrder` → each page → its `childrenIds` recursively, with indentation per depth (e.g. `pl-[depth*14px]`).
  - Each row: a small chevron (Lucide `ChevronRight`, rotates 90° via Framer Motion when expanded) if it has children, a tiny icon/avatar thumbnail (fallback: Lucide `FileText`), and the page title truncated with ellipsis.
  - Row is a single click target that sets `activePageId`.
  - **On hover only** (`opacity-0 group-hover:opacity-100` transition), reveal two icon buttons on the right edge of the row: a `+` (Lucide `Plus`) tooltip "Add sub-page" that creates a child page under this one and expands the tree to reveal it, and a trash icon (Lucide `Trash2`) tooltip "Delete" that removes the page and all its descendants (with a lightweight inline confirm — e.g. the icon morphs into a red "confirm" state on first click, executes on second click within 3 seconds — NOT a `window.confirm()`).
  - Active/selected page row gets a subtle indigo-tinted background and a left accent bar (`border-l-2 border-violet-400`).
- Everything animates with `layout` props on Framer Motion so tree expand/collapse and reordering feels physical, springy, never jumpy.

### B. MAIN CANVAS (flex-1, scrollable, the actual page view)

If no page is selected, show a calm empty state (logo mark, muted prompt to create or select a page).

When a page is active, render top to bottom:

1. **Cover Banner**
   - Full-width, ~256px tall, rounded-b-none/rounded top corners to match canvas edge, `object-cover` background image if `coverImage` is set; if not set, render a subtle animated gradient placeholder (indigo/violet mesh gradient, very low opacity, on the obsidian base) — never an empty gray box.
   - On hover over the banner, fade in a "Change Cover" button (glassmorphic pill, top-right of the banner) with a Lucide `ImagePlus` icon.
   - This button is a `<label>` wrapping a visually-hidden `<input type="file" accept="image/*">`. On file select: read via `FileReader.readAsDataURL`, store the resulting string into `page.coverImage`, persist immediately.
   - If a cover exists, hovering also reveals a small "Remove" (Lucide `X`) affordance.

2. **Page Avatar**
   - A rounded-square or circular avatar (user's choice of shape is fine, pick one and be consistent — recommend `rounded-2xl`), ~96px, positioned overlapping the bottom-left of the cover banner (`-mt-12 ml-8 relative z-10`), with a crisp `border-4 border-[#08080A]` so it "cuts into" the cover.
   - If `avatarImage` unset, show a soft gradient fallback with a Lucide `FileText` or the page's emoji icon centered.
   - Hovering the avatar reveals a small camera/upload icon overlay (Lucide `Camera`) — same `<label>` + hidden file input pattern as the cover, writes to `page.avatarImage`.

3. **Breadcrumbs**
   - Directly below the cover/avatar row, small `text-white/40 text-sm` trail computed by walking `parentId` up to root, joined with a slash or Lucide `ChevronRight` separators, e.g. `NEW LIFE / RAWR / 10K FROM EDITING ARC`. Each crumb is clickable and sets `activePageId` to that ancestor.
   - Uppercase, tracked-out, matches the "OS" aesthetic.

4. **Inline Editable Title**
   - Large bold text (`text-4xl md:text-5xl font-bold tracking-tight`), rendered as a borderless `<textarea>` or `contentEditable` div that auto-grows, no visible input chrome until focused (on focus, maybe a very subtle bottom border or glow appears).
   - Placeholder text "Untitled" in muted gray when empty.
   - Auto-saves on every keystroke (debounced) directly into `page.title` — no explicit save button, no blur-to-confirm popup.
   - When a page is created via "+ New Page", this title auto-focuses immediately with cursor ready.

5. **Block-Based Document Canvas**
   - The Tiptap/BlockNote editor instance, bound to `page.content`, auto-saving on every `onUpdate` (debounced).
   - Must support: `/` slash-command menu (headings H1–H3, bullet list, numbered list, checkable to-do list, code block, quote, divider) rendered as a floating glassmorphic dropdown that filters as you type after `/`; syntax-highlighted code blocks (via `lowlight`/`highlight.js` in a theme matching the obsidian palette); checkable task items with a satisfying check animation; standard bold/italic/inline-code via a selection-triggered floating toolbar (bubble menu), not a fixed toolbar bar, to keep the canvas visually clean.
   - Typing must feel instant — no lag, no layout shift, cursor never jumps.
   - Generous padding (`px-16 py-8` or similar) so text never touches the edges — this is a canvas, not a form.

---

## VISUAL SYSTEM

- **Base background**: `#08080A` (near-black obsidian), applied at the app root.
- **Panels**: glassmorphic — `bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl`, subtle `shadow-2xl shadow-black/50`.
- **Accent glow**: indigo/violet (`from-indigo-500 to-violet-500` gradients at low opacity, `shadow-[0_0_20px_rgba(139,92,246,0.3)]` on hover states, focus rings, and the primary button).
- **Typography**: a crisp modern sans (Inter or similar system stack is fine), tight tracking on headers, generous line-height in body/editor text for readability.
- **Micro-interactions**: every interactive element (buttons, tree rows, hover reveals, checkboxes) gets a Framer Motion spring transition — `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.97 }}`, `layout` for reflow animations. Nothing should snap instantly; nothing should feel sluggish either — keep springs tight (`stiffness: 400, damping: 30` range).
- **No harsh borders**: everything uses low-opacity white borders (`border-white/10`) and shadow for depth, never flat black lines.

---

## INTERACTION PRINCIPLES (the whole point of this app)

- The fastest possible path from "I have a thought" to "it's captured" is: click "+ New Page" → type. No dialog ever interrupts this.
- Nothing requires a category, tag, or type to be chosen before writing.
- All identity/structure (icon, cover, avatar, hierarchy) is optional flavor added later, never a gate to entry.
- Deleting/destructive actions use inline confirm-in-place patterns, never native browser dialogs.
- All image inputs use real native file pickers — never a URL text field.

---

## BUILD NOTES FOR LOVABLE

- Structure the app with clear component boundaries: `Sidebar`, `PageTree`, `PageTreeRow`, `Canvas`, `CoverBanner`, `PageAvatar`, `Breadcrumbs`, `EditableTitle`, `BlockEditor`, and a `lib/storage.ts` + `lib/pages.ts` (tree helper functions: addPage, addChildPage, deletePageAndDescendants, movePages, getAncestors).
- Keep all state in a single top-level store (React context + `useReducer`, or Zustand if available) rather than prop-drilling — this app will grow.
- Seed one welcome page on first load demonstrating headings, a checklist, and a code block, so the editor's capabilities are visible immediately.
- Prioritize the inline-editing feel and the file-picker cover/avatar flow — these are the two things that failed in every previous attempt. Test them explicitly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/545bfcf1-7149-45dd-984b-815a1ee65338).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
