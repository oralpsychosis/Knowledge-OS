# Engineering workflow

## Before implementation

1. Read `AGENTS.md` and the relevant architecture documents.
2. Run `git status -sb`; preserve unrelated work.
3. Pull/fetch when authorized and practical.
4. Start a focused `agent/<short-description>` branch from current `main`.
5. Inspect the actual entry points named in the docs.
6. Write down the user outcome, affected state/data path, and validation plan.

For a bug, reproduce or gather direct evidence before changing code. For a feature, identify the smallest end-to-end slice that proves the user value.

## While implementing

- Keep the diff focused and preserve existing conventions.
- Prefer pure helpers and reducer actions for workspace behavior.
- Keep the app usable after each pushed commit because Lovable consumes published branch history.
- Validate the risky layer early: editor cursor behavior, page-tree integrity, local persistence, auth/sync, or SSR as applicable.
- Do not apply a repository-wide formatter when unrelated user changes are present.
- Never rewrite published history.

## Documentation update matrix

| Change | Required documentation |
| --- | --- |
| New/changed user-facing capability | `PRODUCT.md`, plus the owning architecture document |
| Component, route, provider, editor, or styling architecture | `FRONTEND.md` |
| Type, state invariant, local storage, auth, Supabase, SSR, env, or external-service contract | `BACKEND.md` |
| Command, branching, validation, or completion policy | `AGENTS.md` and/or this file |
| Renamed/moved entry point | Every document that links to it |
| Completed coherent change set | One new line in `LOG.md` |

Documentation should explain durable intent and structure, not narrate every implementation detail. Remove resolved items from “known constraints” when the resolving change lands.

## One-line log protocol

`LOG.md` contains entries only: no heading, blank-line commentary, or multiline descriptions. Append one physical line at the bottom for each coherent completed change set.

Format:

```text
- YYYY-MM-DDTHH:mm:ss±HH:mm | area | concise outcome | validation: checks performed
```

Rules:

- Use an ISO-8601 timestamp with numeric timezone offset.
- Use one area such as `docs`, `frontend`, `backend`, `data`, `auth`, `editor`, or `tooling`.
- Describe the user/developer-visible outcome, not a raw file list.
- Keep validation on the same physical line.
- Never edit, reorder, delete, or reflow an older entry.
- Combine tightly related files into one entry; use separate entries for unrelated change sets.
- A failed or abandoned experiment does not get a log line unless it leaves a deliberate repository change.

## Validation baseline

Install exact npm dependencies when needed:

```powershell
npm.cmd ci
```

For application code:

```powershell
npm.cmd run lint
npm.cmd run build
```

When a change can affect the server import graph or SSR boundary, run the smoke request against the
fresh production artifact:

```powershell
npm.cmd run smoke:ssr
```

Then manually verify the affected flow in a browser. High-value regression checks include:

- create a root page and confirm title focus;
- create/delete/reorder a nested page and inspect tree consistency;
- type in Tiptap and confirm the cursor does not jump;
- reload and confirm local persistence;
- when relevant, sign in, sync, reload, and observe a second-client update;
- run the generated-handler smoke request when changing client-only module boundaries;
- exercise a server-rendered error path when changing SSR/error handling.

There is no broad automated behavior suite today. Add targeted checks when introducing logic that
can be isolated without destabilizing the current toolchain.

For documentation-only work:

```powershell
git diff --check
```

Also verify every referenced path, read the rendered Markdown structure, and review the full diff. Do not install dependencies solely to compile unchanged application code.

## Commit and handoff standard

A commit should represent one understandable, working change. Stage explicit paths when the worktree is mixed.

Before handoff:

1. Review `git diff` and `git status -sb`.
2. Run the relevant validation.
3. Update architecture/product docs.
4. Append one `LOG.md` line.
5. Commit without amending a published commit.
6. Push the feature branch and use a draft PR until validation is complete.

The handoff must state:

- the outcome;
- the branch and changed areas;
- checks and manual verification performed;
- known risks, failures, or follow-up work.
