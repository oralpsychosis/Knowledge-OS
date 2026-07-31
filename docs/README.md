# Documentation map

These documents give a fresh contributor enough context to work safely without reconstructing the entire application from scratch.

## Reading order

1. [../AGENTS.md](../AGENTS.md) — mandatory rules, startup ritual, and completion criteria.
2. [PRODUCT.md](PRODUCT.md) — why the product exists and which experience must be protected.
3. [FRONTEND.md](FRONTEND.md) or [BACKEND.md](BACKEND.md) — load the subsystem relevant to the task.
4. [WORKFLOW.md](WORKFLOW.md) — branch, validation, documentation, and handoff protocol.
5. [../LOG.md](../LOG.md) — compact chronology of completed change sets.

## Source-of-truth order

When information disagrees, use this order:

1. Current source code and configuration describe runtime reality.
2. `AGENTS.md` describes how work must be performed.
3. The subsystem documents describe intended architecture and known constraints.
4. `README.md` is a concise public orientation.
5. `LOG.md` records what changed; it does not replace current architecture docs.

Code winning a disagreement does not make stale documentation acceptable. Confirm whether the code is intentional, then update the affected document in the same branch.

## Ownership

| Document | Owns |
| --- | --- |
| `PRODUCT.md` | Audience, premise, principles, feature boundaries, success test |
| `FRONTEND.md` | Route/provider/component structure, state consumption, editor and design behavior |
| `BACKEND.md` | Data model, local persistence, Supabase contract, auth/sync, SSR boundary |
| `WORKFLOW.md` | Preflight, branch discipline, validation, documentation hooks, log format |
| `LOG.md` | One immutable line per coherent completed change set |

Do not duplicate detailed architecture across files. Link to its owner instead.
