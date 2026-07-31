# Knowledge OS AI rules

[AGENTS.md](AGENTS.md) is the canonical operating contract. Read it before making changes, then use [docs/README.md](docs/README.md) to load the relevant product, frontend, backend, and workflow context.

These are the high-signal implementation constraints:

- Preserve the zero-friction `New Page -> type -> write` product path.
- Keep workspace state in the reducer/provider at `src/store/knowledge.tsx`.
- Keep the normalized page contract in `src/lib/types.ts` and tree mutations in `src/lib/pages.ts`.
- Persist locally only through `src/lib/storage.ts` and remotely only through `src/lib/supabase.ts`.
- Store editor documents as Tiptap JSON, not HTML.
- Use Tailwind CSS v4, existing shadcn/Radix primitives, Lucide icons, and Motion.
- Keep reusable primitives in `src/components/ui`, domain UI in `src/components/os`, and editor logic in `src/components/editor`.
- Do not use browser prompt/confirm/alert flows, save buttons, or required organization before writing.
- Do not edit `src/routeTree.gen.ts` by hand.
- Update the relevant architecture document and append one timestamped line to `LOG.md` with every completed change set.

When this file conflicts with `AGENTS.md`, follow `AGENTS.md` and repair this file in the same change.
