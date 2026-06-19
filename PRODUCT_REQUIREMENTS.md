# Product Requirements

## Product statement

PatchProof is a CLI and GitHub Action that identifies newly added or materially changed tests, transplants those tests onto a base revision, runs them against base and head implementations, and reports whether each test demonstrates a behavioral change caused by the patch.

## V1 goals

- Support Git repositories containing JavaScript/TypeScript or Python projects.
- Accept explicit base and head revisions.
- Discover relevant changed tests through language adapters.
- Create isolated temporary worktrees.
- Evaluate existing head-suite health.
- Run each relevant new test against the base implementation with the new test transplanted.
- Run the same test against the head implementation.
- Produce stable per-test and aggregate classifications.
- Expose the workflow through a local CLI and GitHub Action.
- Work without an AI model, API key, or PatchProof-hosted service.

## Non-goals

- Proving semantic correctness of all changed production code.
- Determining whether code was AI-generated.
- Automatically reviewing style, architecture, security, or performance.
- Supporting arbitrary languages in v1.
- Running a hosted SaaS or storing repository code.
- Providing a hardened sandbox in v1.
- Inferring every possible test command with no configuration.

## User journeys

### Contributor before opening a PR

1. The contributor installs or invokes PatchProof.
2. PatchProof resolves the base and head revisions.
3. It warns that project commands will execute on the host.
4. The contributor confirms, unless approval is already configured.
5. PatchProof discovers changed tests, performs the proof run, and prints evidence.
6. The contributor fixes weak or failing tests before requesting review.

### Maintainer in GitHub Actions

1. The repository checks out full-enough Git history.
2. The action receives event-derived base and head SHAs.
3. PatchProof executes with no interactive prompt.
4. The action writes a job summary and JSON artifact.
5. A non-success aggregate produces a failing status according to configured policy.

## Functional requirements

| ID     | Requirement                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| PR-001 | Resolve and validate base and head Git revisions; base must be an ancestor or an explicitly accepted comparison target. |
| PR-002 | Refuse a dirty source worktree by default; allow an explicit override that is recorded in the report.                   |
| PR-003 | Detect the repository adapter or honor explicit configuration.                                                          |
| PR-004 | Identify added or materially changed tests between base and head.                                                       |
| PR-005 | Create isolated base and head worktrees without modifying the user's checked-out files.                                 |
| PR-006 | Transplant only required test-side changes and test support files onto the base worktree.                               |
| PR-007 | Validate that transplanted test changes apply cleanly; otherwise classify affected tests as `inconclusive`.             |
| PR-008 | Execute configured setup and test commands with bounded timeouts and captured output.                                   |
| PR-009 | Check the relevant tests on head and classify each using the canonical status table.                                    |
| PR-010 | Run the existing head test scope and report regressions separately from proof status.                                   |
| PR-011 | Produce text/Markdown and JSON reports containing revisions, commands, durations, outcomes, and diagnostics.            |
| PR-012 | Require explicit local execution consent unless non-interactive CI or trusted configuration is detected.                |
| PR-013 | Remove temporary worktrees on success, failure, interruption, and timeout where safely possible.                        |
| PR-014 | Never require or silently call an AI or remote PatchProof service.                                                      |
| PR-015 | Return documented, stable process exit codes.                                                                           |
| PR-016 | Support JavaScript/TypeScript and Python as equal v1 adapters.                                                          |
| PR-017 | Aggregate multiple tests without hiding individual outcomes.                                                            |
| PR-018 | Treat unsupported projects and infrastructure failures as non-success, never as proof.                                  |

## Canonical per-test statuses

| Base with transplanted test          | Head with test     | Status          | Meaning                                                                                  |
| ------------------------------------ | ------------------ | --------------- | ---------------------------------------------------------------------------------------- |
| Fails for an expected test assertion | Passes             | `proven`        | The test distinguishes head from base.                                                   |
| Passes                               | Passes             | `not_proven`    | The test does not demonstrate the behavioral change.                                     |
| Fails for an expected test assertion | Fails              | `still_failing` | The proposed patch does not satisfy the test.                                            |
| Cannot be evaluated reliably         | Any, or vice versa | `inconclusive`  | Setup, discovery, transplant, timeout, crash, or infrastructure prevented a valid proof. |

An unexpected process crash, missing dependency, syntax/import failure caused by transplant, or timeout is not an expected assertion failure and therefore cannot produce `proven`.

## Aggregate status

Severity order is:

```text
inconclusive > still_failing > not_proven > proven
```

The aggregate is the highest-severity per-test status, except:

- No relevant tests yields `no_tests`, a non-success aggregate.
- Any existing-suite regression on head yields `regression`, a non-success aggregate.
- Configuration or repository validation failure yields `error`.

V1 does not calculate a numeric quality score.

## Acceptance criteria

- Every requirement is represented in [TASKS.md](TASKS.md) and [TESTING.md](TESTING.md).
- JavaScript and Python fixtures cover every canonical status.
- Reports never call a crash or setup failure `proven`.
- Local execution never begins before consent unless an explicit non-interactive condition applies.
- Worktrees are cleaned without touching user changes.
- The CLI and Action use the same core classification logic.
