# PatchProof

> Your tests pass. PatchProof proves they matter.

PatchProof is a deterministic CLI and GitHub Action for bug-fix pull requests. It checks whether a new or changed regression test distinguishes the proposed revision from its base revision.

```text
base implementation + changed test -> expected assertion failure
head implementation + changed test -> pass
```

That result is called a **proven regression test**. PatchProof does not claim that the entire patch is correct, secure, or complete.

## What PatchProof knows

PatchProof does not read production code and guess the intended bug. Instead, it uses the pull request's Git diff:

1. Resolve immutable base and head commits.
2. Find added or materially changed test files.
3. Parse pytest, Jest, or Vitest declarations.
4. Select test cases whose complete source spans overlap changed lines.
5. Fall back visibly to the changed test file when dynamic syntax prevents reliable case targeting.
6. Copy only eligible test-side files onto an isolated base worktree.
7. Run the selected test against base and head.
8. Compare the full suite on clean base and head revisions.

Use `patchproof inspect` to see the selected tests, source spans, reasons, support files, and commands without executing repository code.

## Status meanings

| Status          | Base with changed test | Head with changed test | Meaning                                                                                                 |
| --------------- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `proven`        | Assertion failure      | Pass                   | The test detects behavior changed by the patch.                                                         |
| `not_proven`    | Pass                   | Pass                   | The test already passed before the patch. It may still be useful, but it is not evidence for this fix.  |
| `still_failing` | Assertion failure      | Assertion failure      | The proposed implementation does not satisfy the test.                                                  |
| `inconclusive`  | Unreliable             | Any                    | Setup, import, collection, timeout, crash, discovery, or transplant prevented a trustworthy comparison. |
| `no_tests`      | —                      | —                      | No eligible added or materially changed tests were found.                                               |
| `regression`    | Full suite passes      | Full suite fails       | The head revision introduces a newly failing suite.                                                     |
| `error`         | —                      | —                      | Configuration or repository validation failed.                                                          |

Only an expected assertion failure on base plus a pass on head can produce `proven`. Unknown failures are conservative: they become `inconclusive`.

## Install

PatchProof requires Git and Node.js 22 or 24.

### npm package

After the alpha is published:

```console
npm install --global @jayadityavetsa/patchproof@alpha
patchproof --version
```

Run without a permanent global installation:

```console
npx --yes @jayadityavetsa/patchproof@alpha inspect --base origin/main
```

### Local prerelease tarball

Build the tarball from a PatchProof checkout:

```console
corepack pnpm install
corepack pnpm build
corepack pnpm pack:cli
```

Install it using the absolute path to the generated `.tgz` file:

```powershell
npm install --global "C:\path\to\PatchProof\artifacts\jayadityavetsa-patchproof-0.1.0-alpha.1.tgz"
```

`.\artifacts\...` only works while your terminal is inside the PatchProof repository. If you run that relative command from another project, npm correctly reports `ENOENT` because the file is not there.

## Inspect before executing

From the repository you want to evaluate:

```console
patchproof inspect --base origin/main
```

Example:

```text
PatchProof 0.1.0-alpha.1 inspection
Base: 41e8c91...
Head: a02f7d4...
Adapter: python

Selected tests:
  tests/test_queue.py::test_rejects_zero_volume (case lines 18-24)
    Changed lines overlap the test's source span.
```

Inspection performs Git and source analysis only. It does not install dependencies or execute project code.

## Run a proof locally

```console
patchproof check --base origin/main
```

PatchProof shows:

- Resolved base and head commits.
- Detected adapter and project root.
- Setup, targeted-test, and suite commands.
- A warning that commands run with your user permissions.

Local execution requires confirmation unless you pass `--yes` or explicitly approve execution in configuration.

Useful forms:

```console
patchproof check --base origin/main --format json --output patchproof-report.json
patchproof check --base origin/main --debug
patchproof check --base origin/main --keep-worktrees
```

## Configuration

PatchProof reads `.patchproof.yml` from the repository root:

```yaml
version: 1
adapter: python

execution:
  setup: [python, -m, pip, install, -e, ".[dev]"]
  targetedTest: [python, -m, pytest, -q, "{test_id}"]
  suite: [python, -m, pytest, -q]
  timeoutSeconds: 120
  suiteTimeoutSeconds: 900

tests:
  include: ["tests/**/test_*.py"]
  exclude: ["tests/generated/**"]
  support: ["tests/helpers/**"]
```

Supported placeholders:

- `{test_id}` — adapter-normalized case or file identifier.
- `{test_file}` — repository-relative test file.
- `{worktree}` — managed worktree root.

Command arrays are preferred because they avoid shell parsing. String commands are trusted configuration and are displayed before local consent.

## GitHub Action

PatchProof can be used directly from GitHub without npm or Marketplace:

```yaml
name: PatchProof

on:
  pull_request:

permissions:
  contents: read

jobs:
  patchproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
        with:
          fetch-depth: 0
      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065
        with:
          python-version: "3.12"
      - uses: JayadityaVetsa/PatchProof@<full-immutable-commit-sha>
        with:
          config: .patchproof.yml
          upload-report: "true"
          fail-on: non-proven
```

The Action:

- Derives base and head SHAs from trusted pull-request event fields.
- Uses read-only repository permission.
- Requires no secret.
- Writes a Markdown job summary.
- Uploads privacy-redacted JSON evidence.
- Never uses `pull_request_target` to execute contributor code.

## Privacy

Reports are privacy-safe by default:

- Repository, temporary, worktree, and home paths become stable placeholders.
- Commands, diagnostics, stdout, and stderr are bounded and redacted.
- Environment values are never copied wholesale into reports.
- Values associated with tokens, passwords, API keys, credentials, authorization, and cookies are redacted.
- GitHub workflow-command output is neutralized.

Debug output remains redacted. Review artifacts before sharing them because arbitrary project output may contain domain-specific sensitive values PatchProof cannot recognize.

PatchProof has no telemetry, hosted account, API key, AI dependency, or hidden proof-classification network call.

## Security warning

PatchProof executes repository setup and test commands with the permissions of the local user or CI runner. Git worktrees protect the active checkout; they are **not a security sandbox**.

Do not execute untrusted code on a machine containing sensitive credentials or network access. For public pull requests, use ephemeral GitHub-hosted runners, `pull_request`, read-only permissions, and no secrets.

See [SECURITY.md](SECURITY.md).

## Compatibility

The `0.1.0-alpha.1` support target is:

- Node.js 22 and 24.
- Python 3.10 through 3.14.
- Windows, macOS, and Linux.
- pytest, Jest, and Vitest.
- npm, pnpm, Yarn, and Bun project detection.
- One configured project per invocation.

Dynamic test generation, custom runners, unusual monorepos, or framework output PatchProof cannot classify reliably may require explicit configuration or produce `inconclusive`.

## Limitations

- PatchProof proves only that selected tests distinguish two revisions.
- It does not infer product intent or find every relevant test.
- It does not prove untested behavior.
- It does not replace code review, security analysis, coverage, mutation testing, or complete CI.
- File-level fallback is less precise than case-level targeting and is always disclosed.
- Host execution is not containment.

## Development

```console
corepack pnpm install
corepack pnpm check
corepack pnpm acceptance:package
corepack pnpm release:verify
```

The repository contains unit, adapter, real-Git-history, process, privacy, and packaged-installation tests. See [TESTING.md](TESTING.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- [CLI specification](docs/CLI_SPEC.md)
- [Configuration](docs/CONFIGURATION.md)
- [Adapter contract](docs/ADAPTER_SPEC.md)
- [Report schema](docs/REPORT_FORMAT.md)
- [GitHub Action](docs/GITHUB_ACTION_SPEC.md)
- [Compatibility](docs/COMPATIBILITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Architecture](ARCHITECTURE.md)

## License

Apache License 2.0. See [LICENSE](LICENSE).
