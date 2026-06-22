# Changelog

## [0.1.0-alpha.2] - 2026-06-20

- Added the searchable GitHub Pages documentation site, public schema, `llms.txt`, citation metadata, and AI-agent guidance.
- Added a ten-repository historical benchmark manifest and reproducible harness.
- Added structured Jest/Vitest output normalization and clearer identical-revision/setup failures.
- Upgraded GitHub Action and test dependencies and generalized OIDC release automation.

All notable changes will be documented here.

The project intends to follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [0.1.0-alpha.3] - 2026-06-21

### Fixed

- Python checks now reject unrelated active/private virtual environments, locate a usable system
  interpreter, create isolated base/head environments for explicit commands, and expose
  `PATCHPROOF_PYTHON` for deterministic interpreter selection.
- Python setup arrays now resolve `python`, `pip`, and `pytest` to the absolute worktree
  interpreter on Windows instead of relying on child `PATH` resolution.
- pytest receives a private temporary directory per worktree, preventing stale-user and concurrent
  runner collisions.

## [Unreleased]

No unreleased changes.

## [0.1.0-alpha.1] - 2026-06-19

### Added

- The `patchproof check` CLI with consent, configuration, stable exits, and text, Markdown, and JSON reports.
- Vitest, Jest, and pytest adapters.
- Temporary Git worktree orchestration and conservative proof classification.
- A bundled Node 24 GitHub Action, cross-platform CI, tests, and release packaging.
- Source-span changed-test selection and the non-executing `patchproof inspect` command.
- Privacy-safe reports with stable path placeholders and secret-value redaction.
- Scoped package metadata for `@jayadityavetsa/patchproof`.
- CodeQL, dependency review, Dependabot, immutable Action pins, SBOM, checksums, and release gates.
