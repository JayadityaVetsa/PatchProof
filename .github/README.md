# PatchProof

> Prove that a changed regression test fails before the fix and passes after it.

[Documentation](https://jayadityavetsa.github.io/PatchProof/) ·
[npm](https://www.npmjs.com/package/@jayadityavetsa/patchproof) ·
[GitHub Action](https://github.com/JayadityaVetsa/PatchProof) ·
[Benchmarks](https://jayadityavetsa.github.io/PatchProof/benchmarks/)

PatchProof is a deterministic CLI and GitHub Action for pytest, Jest, and Vitest:

```text
base implementation + changed test  -> expected assertion failure
head implementation + changed test  -> pass
                                      = proven regression test
```

It does not guess the bug, generate a score, or claim the whole patch is correct. It proves one narrower and useful fact: the selected changed test distinguishes the submitted patch from its base revision.

Python projects receive separate base/head virtual environments and private temporary directories.
PatchProof does not reuse whichever virtual environment happens to be active in your terminal.

## Five-minute local check

Requires Git and Node.js 22 or 24.

```console
npm install --global @jayadityavetsa/patchproof@alpha
cd your-repository
git fetch origin
patchproof inspect --base origin/main --head HEAD
patchproof check --base origin/main --head HEAD
```

`inspect` analyzes Git and source files without executing repository code. `check` displays the commands it will run and asks for consent.

## GitHub Action

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
      - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd
        with:
          fetch-depth: 0
      - uses: JayadityaVetsa/PatchProof@<full-immutable-commit-sha>
        with:
          config: .patchproof.yml
          upload-report: "true"
```

Use a full commit SHA in real workflows. See the [complete Action guide](https://jayadityavetsa.github.io/PatchProof/github-action/).

## Results

| Status          | Base with changed test | Head with changed test | Meaning                                                                               |
| --------------- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `proven`        | Assertion failure      | Pass                   | The test distinguishes the patch from its base.                                       |
| `not_proven`    | Pass                   | Pass                   | The test already passed before the patch.                                             |
| `still_failing` | Assertion failure      | Assertion failure      | The proposed implementation does not satisfy the test.                                |
| `inconclusive`  | Unreliable             | Any                    | Setup, collection, timeout, crash, or another infrastructure problem prevented proof. |
| `no_tests`      | —                      | —                      | No eligible changed tests were selected.                                              |
| `regression`    | Full suite passes      | Full suite fails       | The head introduces a newly failing suite.                                            |

Only an expected assertion failure on base plus a pass on head can become `proven`. Unknown failures remain `inconclusive`.

## Safety and scope

PatchProof uses isolated Git worktrees and privacy-redacted reports, but it executes project setup and test commands with the current user’s permissions. Git worktrees are not a sandbox. Use ephemeral, secret-free runners for untrusted pull requests.

Supported in this alpha:

- pytest, Jest, and Vitest.
- Node.js 22 and 24.
- Python 3.10–3.14.
- Linux, Windows, and macOS.
- One configured project per invocation.

Read the [security model](https://jayadityavetsa.github.io/PatchProof/security/), [limitations](https://jayadityavetsa.github.io/PatchProof/limitations/), and [full documentation](https://jayadityavetsa.github.io/PatchProof/).

## Development

```console
corepack pnpm install
corepack pnpm check
corepack pnpm acceptance:package
corepack pnpm release:verify
```

Apache-2.0 licensed. Contributions and reproducible benchmark cases are welcome.
