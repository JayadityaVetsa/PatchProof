# Repository Structure

The pnpm monorepo:

```text
PatchProof/
  packages/
    core/
    git/
    process/
    adapter-api/
    adapter-javascript/
    adapter-python/
    reporters/
    cli/
    github-action/
  fixtures/
    javascript/
    python/
  docs/
    decisions/
  scripts/
  .github/
```

## Package responsibilities

- `core` — domain model, orchestration, classification, aggregate policy.
- `git` — revision resolution, diffs, worktrees, transplant, cleanup.
- `process` — safe execution, timeouts, capture, cancellation, normalization primitives.
- `adapter-api` — ecosystem-neutral adapter types and contract test harness.
- `adapter-javascript` — JavaScript/TypeScript detection and test-framework integration.
- `adapter-python` — Python/pytest integration.
- `reporters` — text, Markdown, and JSON rendering.
- `cli` — argument parsing, consent, terminal UX, exit mapping.
- `github-action` — event/input translation and job summary.

## Dependency direction

```text
CLI ------------\
GitHub Action ----> Core -> Git / Process / Adapter API / Reporters
                               ^            ^
                               |            |
                    JS/Python adapters -----/
```

Core must not import CLI or GitHub Action. Adapters depend on `adapter-api` and process abstractions, not interface packages. Reporters depend on result types but do not execute work.

## Fixtures

Fixtures are miniature Git histories, not ordinary static sample folders. Each scenario documents commits, expected status, supported platforms, and why the result is correct.

## Current state

The v0.1 implementation populates every package shown above. Generated CLI artifacts are packed into the release tarball; the bundled GitHub Action entrypoint is committed for direct Action consumption.
