# Testing Strategy

## Quality rule

A false `proven` result is the highest-severity correctness defect. Infrastructure uncertainty must reduce confidence to `inconclusive`, never increase it.

## Test layers

### Unit tests

- Exhaustive classifier truth table.
- Aggregate severity and suite-regression override.
- Exit-code mapping.
- Configuration parsing, defaults, precedence, and validation.
- Diff classification and test-support-file rules.
- Command redaction and output truncation.
- Report serialization and schema versioning.

### Contract tests

Every adapter must pass the same suite for:

- Detection and explicit selection.
- Runtime validation.
- Test discovery and stable identifiers.
- Targeted command construction.
- Assertion versus infrastructure failure normalization.
- Dependency/setup failure behavior.
- Test-support-file declaration.

### Fixture integration tests

Both JavaScript and Python fixture families must include:

| Fixture                   | Base outcome           | Head outcome           | Expected                   |
| ------------------------- | ---------------------- | ---------------------- | -------------------------- |
| real regression fix       | assertion failure      | pass                   | `proven`                   |
| ineffective test          | pass                   | pass                   | `not_proven`               |
| unfixed behavior          | assertion failure      | assertion failure      | `still_failing`            |
| base import/setup failure | infrastructure failure | pass                   | `inconclusive`             |
| head setup failure        | assertion failure      | infrastructure failure | `inconclusive`             |
| no test change            | n/a                    | n/a                    | `no_tests`                 |
| head suite regression     | any                    | suite failure          | `regression`               |
| multiple mixed tests      | mixed                  | mixed                  | highest-severity aggregate |

Additional fixtures cover:

- Test helper added on head and required on base.
- Production file accidentally included in transplant.
- Test rename and deletion.
- Nested project/monorepo path.
- Spaces and Unicode in paths.
- Shallow Git history.

### End-to-end CLI tests

- Interactive warning and denial.
- Explicit `--yes` approval.
- Dirty worktree refusal and override.
- Base/head resolution.
- Text, Markdown, and JSON output.
- Every documented exit code.
- Timeout and Ctrl+C cleanup.
- Debug worktree retention.
- Unsupported and ambiguous projects.
- Malformed configuration.

### GitHub Action tests

- `pull_request` event with read-only contents.
- Correct base/head SHA selection.
- Missing history diagnosis.
- Job summary and JSON artifact.
- Fork PR with no secrets.
- No execution through `pull_request_target`.
- Input values passed as arguments, not interpolated shell source.
- Linux, Windows, and macOS runners.

## Cross-platform matrix

CI must include:

- Ubuntu latest supported runner.
- Windows latest supported runner.
- macOS latest supported runner.
- Current active Node LTS and one previous supported LTS.
- Supported Python minor versions documented by the Python adapter.

Path separators, process termination, executable lookup, temporary directories, and Git worktree cleanup need OS-specific assertions.

## Security tests

- Repository command cannot run before consent.
- Malicious filenames and configuration values do not become shell syntax.
- Reports redact configured secret patterns.
- Untrusted output cannot emit active GitHub workflow commands.
- Symlinks and path traversal cannot cause transplant outside managed worktrees.
- Cleanup never targets the active repository or an untracked arbitrary path.
- Action token permissions remain read-only.

## Reliability tests

- Repeat deterministic fixtures multiple times.
- Inject process crashes, timeouts, and cleanup failures.
- Simulate partial worktree creation.
- Cap captured output and test large logs.
- Verify no orphan worktrees after each test run.

## Performance expectations

PatchProof overhead excluding dependency setup and repository tests should remain small relative to test execution. Initial target:

- Under two seconds orchestration overhead for tiny fixtures.
- Bounded memory for logs.
- Targeted test runs by default when reliable.

Performance regressions do not alter correctness; PatchProof must not skip evidence silently to become faster.

## Documentation validation

- Markdown links resolve.
- Terminology matches `docs/GLOSSARY.md`.
- Configuration examples conform to the documented schema.
- Requirement IDs PR-001 through PR-018 appear in tasks or test traceability.
- Every public status has tests and report examples.
- Research statements separate evidence from inference and include access dates.

## Release acceptance

A release candidate is acceptable only when:

- All fixture outcomes pass on all supported operating systems.
- No known path can classify infrastructure failure as `proven`.
- Active-worktree integrity tests pass.
- JSON compatibility tests pass.
- Action security review passes.
- Historical-repository trial results and limitations are documented.
