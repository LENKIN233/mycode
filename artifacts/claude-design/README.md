# Claude Design Artifacts

This directory stores HTML design artifacts created through the local
`/design` workflow.

Common flows:

- `/design <brief>` creates a new starter artifact and queues the
  `claude-design` agent to refine it.
- `/design --template deck <brief>` starts from a specific starter type.
- `/design --latest <brief>` reopens the newest artifact and continues it.
- `/design --file artifacts/claude-design/foo.html <brief>` reopens a specific
  artifact.
- `/design --list` opens the artifact browser backed by `manifest.json`.

Conventions:

- Main deliverables live directly in this folder as `.html` files.
- Each artifact also gets a sidecar metadata file: `name.html.meta.json`.
- `manifest.json` tracks the known artifacts in this directory.
- If Playwright is installed, `/design` also saves a browser verification
  screenshot next to the artifact as `name.preview.png`.
- Significant revisions should use versioned filenames such as `foo-v2.html`.
- Keep supporting assets next to the artifact or in a small subfolder when
  needed.
- The project-level `claude-design` agent lives at
  `.mycode/agents/claude-design.md`.
