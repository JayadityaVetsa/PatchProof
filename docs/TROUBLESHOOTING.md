# Troubleshooting

## Base and head are the same commit

Running `patchproof check` while checked out on `main` usually compares `main` with itself. There is no patch in that situation. Check out the pull-request or demo branch first:

```powershell
git fetch origin
git switch <demo-branch>
patchproof check --base origin/main --head HEAD
```

You can preview the selection without executing project commands:

```powershell
patchproof inspect --base origin/main --head HEAD
```

## Dependency setup failed

PatchProof installs each revision independently. Setup errors include the redacted command, exit code, and bounded pip/npm output. Common causes are an unsupported Python/Node version, unavailable package registry, or a project installation command that differs from `.patchproof.yml`.

## npm cannot find the local tarball

Relative paths are resolved from the current terminal directory. Use the absolute quoted path to the tarball:

```powershell
npm install --global "C:\path\to\PatchProof\artifacts\jayadityavetsa-patchproof-0.1.0-alpha.3.tgz"
```

After publication:

```console
npm install --global @jayadityavetsa/patchproof@alpha
```

## Why was this test selected?

```console
patchproof inspect --base origin/main
```

Inspection shows changed ranges, source spans, selection reasons, targeting granularity, and fallback reasons without executing project code.

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
