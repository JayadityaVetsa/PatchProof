# Troubleshooting

## Revision unavailable

Fetch full history and retry. In GitHub Actions, configure `actions/checkout` with `fetch-depth: 0`.

## Multiple projects or adapters detected

Set `adapter` and `projectRoot` in `.patchproof.yml`.

## Setup or collection failure

Run with `--debug` and reproduce the recorded command in the retained worktree using `--keep-worktrees`. Setup, syntax, import, collection, timeout, and process failures are always inconclusive.

## Dirty repository

Commit or stash active changes. `--allow-dirty` compares committed base/head revisions only and records that limitation.

## Python environment

PatchProof creates `.patchproof-venv` inside each temporary Python worktree. Configure `execution.setup` when the project requires a tool other than an editable pip install.

## Safety

Worktrees protect the active checkout; they are not a sandbox. Do not execute untrusted repository code on a machine with sensitive credentials.
