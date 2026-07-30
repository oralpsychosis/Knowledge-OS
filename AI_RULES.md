# Knowledge OS — AI Development Rules

This document serves as the ground truth for the tech stack and architectural patterns of Knowledge OS. Follow these rules strictly to maintain consistency.

## Tech Stack Overview

- **Framework**: TanStack Start (Full-stack React with file-based routing in `src/routes`).
- **Language**: TypeScript with strict typing.
- **Styling**: Tailwind CSS v4 (using `@import "tailwindcss"` and the new engine).
- **Rich Text**: Tiptap Editor (bound to `JSONContent` state).
- **Animations**: Framer Motion (use `motion` from `motion/react`).
- **UI Components**: shadcn/ui (Radix UI primitives).
- **Icons**: Lucide React exclusively.
- **Persistence**: Hybrid model (IndexedDB for large data, LocalStorage for metadata).
- **Backend/Auth**: Supabase (Auth + PostgreSQL sync for authenticated users).

## Library Usage Rules

### 1. Styling & Layout
- Use **Tailwind CSS** for all styling. Avoid creating new `.css` files unless absolutely necessary for third-party library overrides.
- Prefer the obsidian palette (`#08080A`) and glassmorphic effects (`backdrop-blur-xl`, `bg-white/5`, `border-white/10`).

### 2. Rich Text & Blocks
- All document editing must happen via **Tiptap**.
- Use the existing `SlashCommand` extension in `src/components/editor/slash-command.tsx` for new block types.
- Document content is stored as `JSONContent`. Never manipulate the raw HTML of the editor.

### 3. State Management
- Core app state lives in `src/store/knowledge.tsx` using a React Reducer.
- Do not add external state libraries (Zustand/Redux) without specific instruction.
- Use the `useKnowledge` hook to access pages, active page, and mutations.

### 4. Animations & Micro-interactions
- Use **Framer Motion** for all transitions.
- Use "spring" transitions for physical feel: `stiffness: 400, damping: 30`.
- Utilize `layout` props for smooth element reflows (e.g., expanding the sidebar or page tree).

### 5. Persistence & Sync
- Use `lib/storage.ts` for all local disk operations.
- Use `lib/supabase.ts` for all remote database and authentication logic.
- Ensure all image inputs convert files to **base64 DataURLs** before saving to the store.

### 6. Components
- Put re-usable UI primitives in `src/components/ui/`.
- Put Knowledge OS specific domain components in `src/components/os/`.
- Put editor-specific logic in `src/components/editor/`.

## Anti-Patterns
- ❌ No `window.prompt` or `window.confirm`. Use inline UI or Radix Dialogs.
- ❌ No direct DOM manipulation.
- ❌ No external CSS frameworks or icon sets.
- ❌ No "Save" buttons. Everything must be auto-saved/debounced.