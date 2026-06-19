# Architecture

## Overview

PatchProof is a pnpm monorepo with a language-neutral TypeScript core and adapter packages for JavaScript/TypeScript and Python. The CLI and GitHub Action are thin interfaces over the same orchestration engine.

```text
CLI / GitHub Action
        |
Configuration + repository validation
        |
Proof orchestrator
   |       |        |
 Git   Adapter   Process runner
   |       |        |
Worktrees  Test discovery/execution
        |
Evidence normalizer
        |
Classifier
        |
Text / Markdown / JSON reporters
```

## Execution model

Given base revision `B` and head revision `H`:

1. Validate repository state, revisions, configuration, adapter, and consent.
2. Compute the diff from `B` to `H`.
3. Ask the adapter to identify relevant changed tests and required test-support files.
4. Create temporary detached worktrees for `B` and `H`.
5. Prepare dependencies according to configuration and adapter policy.
6. In the base worktree, apply only the test-side patch needed to run each new test.
7. Run the targeted test on the transplanted base.
8. Run the equivalent targeted test on head.
9. Run the configured existing-suite scope on head.
10. Normalize raw process outcomes into evidence.
11. Classify each test and compute an aggregate.
12. Render reports and clean temporary state.

PatchProof must not apply production-code changes to the base worktree. A proof is invalid if the transplant includes the fix under test.

## Worktree manager

The Git subsystem will:

- Resolve symbolic refs to immutable commit SHAs.
- Verify required objects are available, with actionable guidance for shallow clones.
- Refuse dirty state by default because uncommitted changes are not represented by base/head SHAs.
- Create worktrees below a PatchProof-managed temporary directory.
- Track every created path in a cleanup journal.
- Remove worktrees through Git before deleting residual directories.
- Preserve failed worktrees only when the user requests debugging retention.

No operation may reset, checkout, clean, or overwrite the user's active worktree.

## Adapter boundary

Adapters translate ecosystem details into a shared contract:

- Detect project compatibility and confidence.
- Validate runtime and manifest prerequisites.
- Discover changed test cases.
- Identify test-support files required for transplant.
- Define dependency setup.
- Construct targeted and suite commands.
- Interpret framework output enough to distinguish assertion failure from infrastructure failure.
- Normalize test identifiers and locations.

The core owns classification. Adapters cannot directly declare a test `proven`.

## Process runner

Commands execute without shell interpolation where possible. The runner records:

- Executable and argument vector.
- Redacted environment metadata.
- Working directory.
- Start/end timestamps and duration.
- Exit code or termination signal.
- Bounded stdout/stderr.
- Timeout and interruption state.

Configuration-supplied shell commands are an explicit trust boundary and must be displayed before local consent.

## Evidence and classification

Raw command results are normalized into:

- `pass`
- `assertion_failure`
- `infrastructure_failure`
- `timeout`
- `interrupted`

Only `assertion_failure` on base plus `pass` on head can become `proven`. Classification is a pure function over normalized evidence and is covered by exhaustive unit tests.

## Reporting

Reporters consume one immutable result model. Human output may evolve, while JSON follows a versioned schema. Reports include limitations and never imply that proof covers untested behavior.

See [Report Format](docs/REPORT_FORMAT.md).

## GitHub Action

The Action:

- Uses event SHAs rather than parsing untrusted PR text.
- Requires `contents: read` by default.
- Does not require secrets.
- Runs the same core engine non-interactively.
- Writes a job summary and optional JSON artifact.
- Avoids `pull_request_target` for executing PR code.

See [GitHub Action Specification](docs/GITHUB_ACTION_SPEC.md) and [Security Policy](SECURITY.md).

## Failure and cleanup

Every orchestration phase returns structured failure data. Cleanup runs in a finalization path and must tolerate partially created worktrees. Cleanup failure is reported without replacing the primary failure.

## Architectural constraints

- No network call is part of proof classification.
- No AI output can influence canonical status.
- Core packages must not depend on CLI or Action packages.
- Adapter failures cannot be mistaken for test failures.
- Public status meanings are stable across interfaces.
