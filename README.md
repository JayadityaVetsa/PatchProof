# PatchProof

> **Your tests pass. PatchProof proves they matter.**

PatchProof is an open-source CLI and GitHub Action that verifies a bug-fix pull request by running its new regression tests against both the base and head implementations.

The central proof is simple:

```text
OLD IMPLEMENTATION + NEW TEST -> FAIL
NEW IMPLEMENTATION + NEW TEST -> PASS
```

When both observations are reliable, PatchProof reports that the regression test is `proven`. It does not claim that the entire patch is correct, secure, or complete.

## Why PatchProof?

A green test suite shows that tests pass after a change. It does not show that a newly added test would have failed before the fix. Coverage tools measure execution; mutation tools perturb code; AI reviewers interpret changes. PatchProof focuses on a narrower question: **does this test distinguish the proposed patch from its base revision?**

PatchProof is deterministic by default. It does not require an AI model, API key, hosted account, or paid service.

## Quick start

PatchProof requires Node.js 22 or 24 and Git:

```console
npm install --global patchproof
patchproof check --base main
```

The first local run displays every repository command and asks for consent. CI and explicitly approved runs are non-interactive.

Create `.patchproof.yml` when auto-detection is ambiguous:

```yaml
version: 1
adapter: javascript
execution:
  setup: [pnpm, install, --frozen-lockfile]
  targetedTest: [pnpm, exec, vitest, run, "{test_file}"]
  suite: [pnpm, test]
```

## Example

```console
$ patchproof check --base main

PatchProof 0.x
Base:  41e8c91
Head:  a02f7d4

PROVEN       tests/divide.test.ts > accepts age 18
NOT_PROVEN   tests/format.test.ts > formats empty values

Aggregate: NOT_PROVEN
1 proven, 1 not proven, 0 still failing, 0 inconclusive
```

## Implemented in v0.1.0

- A bundled TypeScript CLI managed in a pnpm workspace.
- Vitest, Jest, and pytest adapters with case-level discovery and visible file-level fallback.
- A Node 24 GitHub Action backed by the same core engine.
- Temporary Git worktrees for isolated base and head evaluation.
- Host execution with an explicit safety warning for local users.
- Human-readable Markdown/text and stable JSON reports.

See [Compatibility](docs/COMPATIBILITY.md), [Troubleshooting](docs/TROUBLESHOOTING.md), and the [demo](docs/DEMO.md).

## What PatchProof is not

- An AI-code detector or authorship classifier.
- A complete code reviewer.
- A security scanner.
- A replacement for coverage, static analysis, mutation testing, or human review.
- A guarantee that a patch has no defects.
- A hosted service in v1.

## Documentation map

- [Vision](VISION.md)
- [Product requirements](PRODUCT_REQUIREMENTS.md)
- [Architecture](ARCHITECTURE.md)
- [Product design](DESIGN.md)
- [Market research](MARKET_RESEARCH.md)
- [Implementation tasks](TASKS.md)
- [Testing strategy](TESTING.md)
- [Roadmap](ROADMAP.md)
- [CLI specification](docs/CLI_SPEC.md)
- [Configuration](docs/CONFIGURATION.md)
- [Adapter contract](docs/ADAPTER_SPEC.md)
- [Report format](docs/REPORT_FORMAT.md)
- [GitHub Action](docs/GITHUB_ACTION_SPEC.md)
- [Repository structure](docs/REPOSITORY_STRUCTURE.md)
- [Glossary](docs/GLOSSARY.md)
- [Architecture decisions](docs/decisions/README.md)

## License

PatchProof is planned under the [Apache License 2.0](LICENSE).
