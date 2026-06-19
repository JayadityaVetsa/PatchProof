# Implementation Tasks

> **Status (2026-06-18):** Milestones 0 through 9 have a working v0.1 first draft. The remaining hardening work is expanded framework fixtures, historical public-repository trials, external GitHub-hosted matrix results, signing, and publication.

This is the ordered build plan. A milestone is complete only when its implementation, documentation, and tests satisfy the listed exit criteria.

## Milestone 0 — Repository bootstrap

- [ ] Initialize Git with `main` as the default branch.
- [ ] Add pnpm workspace and TypeScript project configuration.
- [ ] Add formatting, linting, type-checking, test, and documentation-link commands.
- [ ] Add Apache-2.0 package metadata and repository-wide Node version policy.
- [ ] Add CI on Windows, Linux, and macOS.
- [ ] Add issue and pull-request templates.

**Exit:** a contributor can clone, install, run all checks, and understand failures.

## Milestone 1 — Domain model and classifier

- [ ] Define versioned result types for repository, execution, test evidence, per-test status, suite health, and aggregate status.
- [ ] Implement pure classification rules from `PRODUCT_REQUIREMENTS.md`.
- [ ] Implement stable exit-code mapping from `docs/CLI_SPEC.md`.
- [ ] Add exhaustive table-driven tests, including infrastructure failures that must never become `proven`.

**Covers:** PR-009, PR-011, PR-015, PR-017, PR-018.  
**Exit:** all classification behavior works without Git or subprocesses.

## Milestone 2 — Git and workspace isolation

- [ ] Resolve base/head refs and validate commit availability.
- [ ] Detect dirty state and explicit override.
- [ ] Create and remove temporary detached worktrees.
- [ ] Compute file/test diffs.
- [ ] Build a test-only patch and reject production-file leakage.
- [ ] Add interruption-safe cleanup journal and optional debug retention.

**Covers:** PR-001, PR-002, PR-005, PR-006, PR-007, PR-013.  
**Exit:** fixture repositories can be prepared and cleaned on all three operating systems without modifying the active worktree.

## Milestone 3 — Process runner and safety

- [ ] Implement argument-vector execution with captured output.
- [ ] Add setup/test timeouts, cancellation, output bounds, and redaction hooks.
- [ ] Normalize pass, assertion failure, infrastructure failure, timeout, and interruption.
- [ ] Show execution plan and require local consent.
- [ ] Add `--yes`/CI behavior and record bypass reason.

**Covers:** PR-008, PR-012, PR-014.  
**Exit:** unconfirmed commands never run; every termination path yields structured evidence.

## Milestone 4 — Adapter framework

- [ ] Implement adapter detection, explicit selection, validation, discovery, command construction, and normalization contracts.
- [ ] Resolve ambiguity without silent guessing.
- [ ] Add contract test suite reusable by all adapters.

**Covers:** PR-003, PR-004, PR-016.  
**Exit:** a fake adapter passes the full contract suite.

## Milestone 5 — JavaScript/TypeScript adapter

- [ ] Detect package manager and supported test frameworks.
- [ ] Support explicit install, targeted-test, and suite commands.
- [ ] Implement initial discovery/targeting for the chosen v1 frameworks.
- [ ] Distinguish assertion failure from syntax, import, setup, and runner failures.
- [ ] Add fixtures for all statuses and failure modes.

**Exit:** JavaScript fixtures satisfy the full acceptance matrix.

## Milestone 6 — Python adapter

- [ ] Detect Python project markers and supported test framework.
- [ ] Support explicit environment/setup and test commands.
- [ ] Implement initial pytest discovery and targeting.
- [ ] Distinguish assertion failures from collection, import, setup, and interpreter failures.
- [ ] Add fixtures for all statuses and failure modes.

**Exit:** Python fixtures satisfy the same acceptance matrix as JavaScript.

## Milestone 7 — Orchestrator

- [ ] Connect validation, worktrees, adapters, transplant, execution, suite health, classification, cleanup, and cancellation.
- [ ] Support multiple tests with independent evidence.
- [ ] Ensure existing head-suite regressions override aggregate proof success.
- [ ] Preserve primary and cleanup diagnostics.

**Covers:** PR-001 through PR-018.  
**Exit:** end-to-end fixture runs produce deterministic result objects.

## Milestone 8 — CLI

- [ ] Implement `patchproof check`.
- [ ] Implement configuration loading and precedence.
- [ ] Add text, Markdown, and JSON output.
- [ ] Add quiet/non-interactive/debug modes.
- [ ] Provide actionable errors and reproduction commands.

**Exit:** all CLI examples and exit codes in `docs/CLI_SPEC.md` are executable tests.

## Milestone 9 — GitHub Action

- [ ] Package the CLI as a JavaScript Action.
- [ ] Resolve safe event SHAs and validate checkout depth.
- [ ] Write job summary and JSON artifact.
- [ ] Apply least-privilege permissions and document SHA pinning.
- [ ] Test fork PR behavior without secrets and prohibit unsafe event patterns.

**Exit:** demonstration repositories show passing and failing checks on pull requests.

## Milestone 10 — Hardening and release

- [ ] Run the cross-platform, fixture, security, interruption, and performance suites.
- [ ] Test at least ten historical public bug-fix commits.
- [ ] Re-run competitor research and revise claims.
- [ ] Complete threat model, changelog, release checklist, and support policy.
- [ ] Publish signed/tagged `v0.1.0` packages and immutable Action commit guidance.
- [ ] Produce a short reproducible demo and launch documentation.

**Exit:** every acceptance criterion in `PRODUCT_REQUIREMENTS.md` and `TESTING.md` is evidenced.

## Deferred

- [ ] Docker/container execution backend.
- [ ] Additional language adapters.
- [ ] Flakiness estimation through statistical reruns.
- [ ] Optional local/BYOK AI explanations.
- [ ] Hosted dashboard, GitHub App, or persistent service.
- [ ] Numeric patch quality scores.
