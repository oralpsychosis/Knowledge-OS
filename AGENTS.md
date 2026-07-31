<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Knowledge OS agent guide

This file is the operating contract for every human or agent working in this repository. The goal is to preserve the product premise, keep architectural context available to fresh sessions, and leave every branch understandable and runnable.

## Required startup ritual

Before editing code:

1. Run `git status -sb` and identify the current branch. Preserve unrelated local work.
2. Read [docs/README.md](docs/README.md), [docs/PRODUCT.md](docs/PRODUCT.md), and the subsystem document relevant to the task.
3. Read the files named as source-of-truth entry points in those documents. Documentation is orientation; current code is runtime reality.
4. If starting from `main`, create a focused `agent/<short-description>` branch. Do not develop directly on `main`.
5. State the intended user outcome, affected data flow, and validation plan before implementation.

If documentation and code disagree, do not silently choose one. Treat code as the current behavior, determine whether it is intentional, and update the relevant documentation in the same change.

## Product premise

Knowledge OS is a dark, block-based thinking workspace for people who need almost no friction between having a thought and capturing it. The default path is:

`New Page -> type a title -> write`

Protect these invariants:

- Capture comes before organization; titles, hierarchy, covers, avatars, and templates are optional.
- Core writing is inline and autosaved. Do not add a save button or a core-editing modal.
- Never use `window.prompt`, `window.confirm`, or `window.alert` for product workflows.
- Destructive actions use an inline or designed confirmation state.
- Uploaded images use a native file picker and become data URLs before entering workspace state.
- Keep the interface dark, focused, calm, and responsive to reduced-motion preferences.

The fuller product contract is in [docs/PRODUCT.md](docs/PRODUCT.md).

## Architecture at a glance

- **Runtime:** TanStack Start, React 19, TypeScript, Vite.
- **Routing:** file-based routes in `src/routes`; `src/routeTree.gen.ts` is generated.
- **State:** one React context/reducer in `src/store/knowledge.tsx`.
- **Editor:** Tiptap JSON documents in `src/components/editor`.
- **Local persistence:** IndexedDB primary plus localStorage fallback/mirror via `src/lib/storage.ts`.
- **Cloud:** browser-side Supabase Google Auth, one JSON document per user, and Realtime subscriptions via `src/lib/supabase.ts`.
- **UI:** Tailwind CSS v4, shadcn/Radix primitives, Lucide icons, and Motion animations.
- **SSR safety:** `src/start.ts` and `src/server.ts` wrap middleware and catastrophic render errors.

Read [docs/FRONTEND.md](docs/FRONTEND.md) and [docs/BACKEND.md](docs/BACKEND.md) before changing those systems.

## Repository boundaries

| Path | Responsibility |
| --- | --- |
| `src/routes/` | TanStack route shell and route composition |
| `src/store/knowledge.tsx` | Workspace reducer, provider API, hydration, persistence orchestration, sync |
| `src/lib/types.ts` | Persisted workspace data contract |
| `src/lib/pages.ts` | Pure page-tree operations and seed data |
| `src/lib/storage.ts` | IndexedDB/localStorage adapter and file-to-data-URL helper |
| `src/lib/supabase.ts` | Supabase client, OAuth, remote document I/O, Realtime |
| `src/components/os/` | Knowledge OS product components |
| `src/components/editor/` | Tiptap configuration and slash commands |
| `src/components/ui/` | Reusable shadcn/Radix UI primitives |
| `src/styles.css` | Tailwind theme plus shared OS/editor styles |
| `public/sounds/` | Focus-audio assets |

Do not hand-edit generated files, especially `src/routeTree.gen.ts`.

## Implementation rules

- Keep strict TypeScript. Avoid `any`; if an external payload forces it, validate/narrow at the boundary.
- Keep workspace mutations in the reducer and pure helpers. Components should call `useKnowledge()` rather than mutate persisted state directly.
- Preserve the flat `pages` map plus `rootOrder` and `childrenIds` invariants.
- Keep rich text as Tiptap `JSONContent`; never make raw editor HTML the persisted source of truth.
- Use `src/lib/storage.ts` for local workspace persistence and `src/lib/supabase.ts` for remote persistence.
- Do not introduce Redux, Zustand, another database, icon library, styling framework, or editor without explicit approval.
- Use Tailwind for component styling. Put only shared design tokens, editor rules, or necessary global behavior in `src/styles.css`.
- Use Lucide React for interface icons. Existing emoji used as content/labels may remain.
- Use Motion for meaningful transitions, with tight spring behavior around `stiffness: 400, damping: 30`; do not animate every static surface.
- Reuse `src/components/ui/` primitives for dialogs and controls. Core editing must remain inline even though secondary tools may use dialogs.
- Never log, paste, or document values from `.env`. Never expose a Supabase service-role key to client code.

## Documentation maintenance hooks

Documentation is part of the feature, not a later cleanup task.

| When a change affects… | Update in the same change |
| --- | --- |
| Product promise, user flow, feature set, or non-goals | `docs/PRODUCT.md` |
| Routes, providers, components, editor, styling, or client state flow | `docs/FRONTEND.md` |
| Data model, persistence, auth, sync, environment variables, SSR, or external services | `docs/BACKEND.md` |
| Commands, branch policy, validation, handoff, or documentation process | `AGENTS.md` and/or `docs/WORKFLOW.md` |
| Any completed change set | Append exactly one physical line to `LOG.md` |

`LOG.md` is append-only. Each coherent change set gets one ISO-8601 timestamped line; never rewrite old entries. Follow the exact format in [docs/WORKFLOW.md](docs/WORKFLOW.md).

## Validation

Use the smallest relevant checks while iterating, then run the full baseline before handing off a code change:

```powershell
npm.cmd run lint
npm.cmd run build
```

There is no automated test suite yet. For behavior changes, also exercise the affected flow in the browser and report what was manually verified. Documentation-only changes require link/path review, `git diff --check`, and a final diff read; they do not require dependency installation solely to compile unchanged application code.

## Git and delivery

- Keep `main` clean. Use one focused branch per coherent change.
- Commit only files belonging to the task.
- Never force-push, rebase, amend, or squash commits that have already been pushed.
- Pull before branching when network access is available; merge rather than rewrite if a published branch must absorb upstream work.
- Push only after relevant validation succeeds and the branch is in a usable state.
- Prefer a draft pull request until the change is fully validated.

## Definition of done

A change is complete only when:

- the requested user outcome works;
- persisted-state and sync implications were considered;
- relevant checks pass or failures are reported precisely;
- architecture/product docs match the resulting behavior;
- one line was appended to `LOG.md`;
- the final handoff names changed files, validation performed, and any remaining risk.
