# Knowledge OS

Knowledge OS is a dark, block-based thinking workspace built to minimize the distance between having a thought and capturing it. It combines nested pages, a Tiptap editor, local-first persistence, optional Supabase cloud sync, cover/avatar customization, search, templates, a hierarchy graph, and layered focus audio.

The application is built with TanStack Start, React 19, TypeScript, Tailwind CSS v4, shadcn/Radix, Motion, Tiptap, and Supabase.

## Start locally

Requirements: a current Node.js release and npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Production checks:

```powershell
npm.cmd run lint
npm.cmd run build
```

Cloud authentication and sync use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never place a Supabase service-role key in this client application. The current auth bootstrap expects a configured Supabase client; see [docs/BACKEND.md](docs/BACKEND.md) before changing environment or offline behavior.

## Documentation

| Start here | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Mandatory operating rules for contributors and agents |
| [docs/README.md](docs/README.md) | Documentation map and source-of-truth order |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Concept, audience, principles, current experience |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Routes, providers, state, editor, components, design system |
| [docs/BACKEND.md](docs/BACKEND.md) | Persistence, Supabase, auth, sync, SSR, data contracts |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Branching, validation, documentation hooks, handoff |
| [LOG.md](LOG.md) | Append-only one-line change history |

## Repository shape

```text
src/
  components/editor/  Tiptap editor and slash commands
  components/os/      Knowledge OS product UI
  components/ui/      Shared shadcn/Radix primitives
  lib/                Types, page helpers, storage, auth, sync, SSR utilities
  routes/             TanStack file-based routes
  store/              Workspace reducer and orchestration
public/sounds/         Focus-audio tracks
docs/                  Durable context for future contributors
```

This repository is connected to Lovable. Published history must remain additive: do not force-push, rebase, amend, or squash pushed commits.
