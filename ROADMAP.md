# Roadmap

Roadmap ordering reflects learning dependencies, not promised dates.

## V0 — Foundation

- Documentation and architecture decisions.
- Repository bootstrap and contribution workflow.
- Domain model, classifier, Git worktrees, and process runner.
- Fixture-driven development.

## V0.1 — Local proof

- `patchproof check`.
- JavaScript/TypeScript adapter.
- Python/pytest adapter.
- Explicit configuration.
- Text and JSON reports.
- All four canonical per-test statuses.

## V0.2 — Pull-request workflow

- GitHub Action.
- Markdown job summaries.
- Stable JSON artifact.
- Cross-platform CI.
- Security guidance for untrusted pull requests.

## V1.0 — Trusted public release

- Tested historical public patches.
- Stable configuration and report schema.
- Clear compatibility matrix.
- Reliable cleanup and interruption behavior.
- Documented support and release policy.

## Post-v1 candidates

- More JavaScript and Python test frameworks.
- Rust, Go, Java, and other adapters.
- Optional container runner.
- Flakiness detection and configurable repeated runs.
- Test-to-change relationship visualization.
- Standard evidence attestations.
- IDE integrations.

## Explicitly deferred

- Required AI or API integrations.
- AI-generated canonical classifications.
- Generic PR review comments.
- AI authorship detection.
- Hosted repository ingestion.
- Numeric “patch quality” scores.
- GitHub App requiring a backend service.

Optional AI explanations may be considered only after deterministic evidence is stable. They must be clearly labeled, local or bring-your-own-key, and unable to change proof status.
