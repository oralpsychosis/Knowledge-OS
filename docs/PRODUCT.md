# Product premise

## One sentence

Knowledge OS is a premium, dark, block-based workspace that helps an easily interrupted mind capture a thought immediately and add structure only when useful.

## Who it is for

The core user has many fast-moving thoughts and a low tolerance for setup friction. They benefit from:

- an obvious place to start writing;
- no required tags, folders, categories, or metadata;
- calm visual hierarchy rather than a dense productivity dashboard;
- optional spatial structure through nested pages;
- focus support that does not interrupt writing.

This is not a generic database builder or a form-driven project manager.

## Primary loop

1. Open the workspace.
2. Click **New Page**.
3. The empty title receives focus.
4. Type the title and move directly into the document.
5. Use `/` only when a structured block is useful.
6. Let autosave handle durability.

Every proposed feature should be judged by whether it shortens, preserves, or obstructs this loop.

## Product principles

### Capture before organization

Pages can be untitled and root-level. Covers, avatars, hierarchy, templates, and visual graph tools are optional enhancements, never admission requirements.

### Inline core work

Titles and document content are edited in place. There is no explicit save action. Core creation and editing must not be hidden behind a modal.

### Designed confidence

Destructive actions need an intentional in-product confirmation state. Native browser prompts break the product feel and are prohibited.

### Personal and atmospheric

The obsidian interface, soft violet glow, cover imagery, page avatars, and mixable ambient audio make the workspace feel like a personal operating environment rather than a plain notes form.

### Local durability with optional continuity

The workspace is saved locally on every state change. A signed-in user also gets cross-session/cloud continuity through Supabase. Cloud features must not weaken local data safety.

## Current user-visible capabilities

- Home dashboard with recent and all-page views.
- Root pages and arbitrarily nested sub-pages.
- Up/down ordering among siblings.
- Inline title editing and recursive breadcrumbs.
- Tiptap blocks: paragraphs, headings, bullet and numbered lists, tasks, code, quotes, and dividers.
- `/` command palette and selection bubble formatting.
- Uploadable cover/avatar images plus a curated remote cover gallery.
- Title search with `Ctrl/Cmd + K`.
- ADHD brain dump, project canvas, and sprint templates.
- A calm, map-like knowledge graph for exploring page hierarchy in overview or local focus.
- Layered ambient sound tracks with persistent local preferences.
- Google sign-in, cloud state sync, and a sync indicator when Supabase is configured.

## Deliberate non-goals unless explicitly approved

- Required schemas, tags, categories, or setup wizards before writing.
- A card-first sticky-note experience.
- Manual save/publish controls for ordinary editing.
- Multiple competing editors, state stores, databases, icon sets, or design systems.
- Treating the hierarchy graph as a semantic backlink graph; its links still represent parent-child structure only.

## Experience acceptance test

A first-time user should be able to capture a meaningful thought within seconds, without understanding the data model or making an organizational decision. A returning user should see their existing workspace, select a page, and resume typing without waiting for a save or sync workflow.

## Feature decision filter

Before building a feature, answer:

1. Which concrete user moment does it improve?
2. Does it add friction to the primary capture loop?
3. Is it core editing or an optional secondary tool?
4. What happens to local data, remote data, and existing documents?
5. Can the user recover from failure without losing writing?
6. Which product and architecture documents must change with it?
