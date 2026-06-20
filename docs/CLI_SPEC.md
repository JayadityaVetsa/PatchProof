# CLI Specification

## Command

```console
patchproof check [options]
```

```console
patchproof inspect [options]
```

`inspect` reports selected tests, source spans, selection and fallback reasons, support files, and commands without executing repository code. `check` performs the proof run. Future commands must not change canonical status meanings.

## Inputs

| Option                  | Purpose                            | Default                                                          |
| ----------------------- | ---------------------------------- | ---------------------------------------------------------------- | ------------- | ---------------------------------------------- |
| `--base <ref>`          | Base revision                      | merge base with configured/default branch; in CI, event base SHA |
| `--head <ref>`          | Head revision                      | `HEAD`; in CI, event head SHA                                    |
| `--config <path>`       | Configuration file                 | nearest `.patchproof.yml`                                        |
| `--adapter <name>`      | `javascript` or `python`           | high-confidence detection                                        |
| `--test-command <cmd>`  | Explicit targeted command template | configuration/adapter                                            |
| `--suite-command <cmd>` | Existing-suite command             | configuration/adapter                                            |
| `--setup-command <cmd>` | Dependency/setup command           | configuration/adapter                                            |
| `--timeout <duration>`  | Per-test timeout                   | configuration default                                            |
| `--format <text         | markdown                           | json>`                                                           | Output format | `text` on terminal, `json` only when requested |
| `--output <path>`       | Write report to file               | stdout                                                           |
| `--yes`                 | Approve host execution             | false locally                                                    |
| `--allow-dirty`         | Permit dirty active worktree       | false                                                            |
| `--keep-worktrees`      | Retain temporary worktrees         | false                                                            |
| `--no-color`            | Disable color                      | honors `NO_COLOR`                                                |
| `--quiet`               | Suppress progress, retain result   | false                                                            |
| `--debug`               | Include diagnostic detail          | false                                                            |

Exact flag naming may change before implementation, but behavior and safety requirements are normative.

## Consent

Before executing project commands locally, show:

- Resolved repository and revisions.
- Adapter.
- Worktree root.
- Setup, targeted-test, and suite commands.
- Warning that commands run with user permissions.

Require an interactive confirmation. Consent may be skipped only with `--yes`, `execution.approved: true`, or recognized CI mode. The report records the mechanism.

`inspect` does not require consent because it performs no project command execution.

## Output

Human output leads with aggregate status and per-test status. JSON follows [REPORT_FORMAT.md](REPORT_FORMAT.md). Diagnostic logs are summarized; full bounded logs are available in debug output or report fields.

## Exit codes

| Code | Meaning                                                                                           |
| ---: | ------------------------------------------------------------------------------------------------- |
|    0 | Aggregate `proven` and no head-suite regression.                                                  |
|    1 | Valid run produced `not_proven`, `still_failing`, `no_tests`, or `regression`.                    |
|    2 | Usage or configuration error.                                                                     |
|    3 | `inconclusive` due to environment, setup, discovery, transplant, timeout, or unsupported project. |
|    4 | User declined execution or interrupted the run.                                                   |
|    5 | Internal PatchProof defect.                                                                       |

Mixed results use the aggregate severity rules in `PRODUCT_REQUIREMENTS.md`.

## Dirty repositories

Default behavior is refusal before worktree creation. `--allow-dirty` compares committed base/head revisions only; uncommitted changes are excluded and the report prominently records this limitation.

## Examples

```console
patchproof check --base main
patchproof check --base origin/main --format json --output patchproof.json --yes
patchproof check --adapter python --test-command "pytest {test_id}" --yes
```

Command templates are parsed as trusted configuration, not interpolated with untrusted PR metadata.
