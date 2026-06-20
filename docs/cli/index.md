# CLI reference

## `patchproof inspect`

Shows revisions, adapter, selected tests, support files, commands, source spans, and reasons without executing repository code.

```sh
patchproof inspect --base origin/main --head HEAD
patchproof inspect --base origin/main --format json --output inspection.json
```

## `patchproof check`

Creates isolated worktrees, installs dependencies, evaluates targeted tests against base and head, compares clean suites, writes reports, and cleans up.

```sh
patchproof check --base origin/main --head HEAD
patchproof check --base origin/main --yes --format json --output report.json
```

Important options:

- `--base <ref>` and `--head <ref>`.
- `--adapter javascript|python`.
- `--project-root <path>`.
- `--config <path>`.
- `--format text|markdown|json`.
- `--output <path>`.
- `--allow-dirty`.
- `--keep-worktrees`.
- `--quiet` and `--debug`.
- `--yes` to acknowledge host execution non-interactively.

Run `patchproof --help` and `patchproof check --help` for the version-matched interface.
