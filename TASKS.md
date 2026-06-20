# Implementation Status

## Completed for `0.1.0-alpha.1`

- [x] pnpm/TypeScript monorepo, linting, formatting, type checking, tests, and documentation validation.
- [x] Canonical evidence, status, aggregate, diagnostic, report, and exit-code models.
- [x] Git revision validation, dirty-tree policy, diffs, temporary worktrees, test-only transplant, and cleanup.
- [x] Bounded process execution, timeout, interruption, output capture, redaction, and local consent.
- [x] pytest, Jest, and Vitest detection, changed-test discovery, source-span selection, and file fallback.
- [x] Base/head targeted execution, clean-suite comparison, classification, and privacy-safe reporting.
- [x] `patchproof inspect` and `patchproof check`.
- [x] Text, Markdown, JSON, CLI, and Node 24 GitHub Action interfaces.
- [x] Cross-platform Node 22/24 and Python 3.10–3.14 CI.
- [x] Scoped npm package metadata, package installation acceptance, SBOM, checksum, and release verification tooling.
- [x] CodeQL, dependency review, Dependabot, immutable Action pins, and least-privilege workflow permissions.
- [x] Public documentation for installation, selection, statuses, configuration, privacy, security, troubleshooting, and release operations.

## Alpha release gates

- [ ] Complete successful GitHub-hosted CI for the alpha commit.
- [ ] Enable private vulnerability reporting, Discussions, secret scanning, and push protection where supported.
- [ ] Configure the protected `npm-release` environment.
- [ ] Run and document historical public bug-fix trials.
- [ ] Manually review tarball contents, privacy scan, SBOM, and release notes.
- [ ] Confirm npm account two-factor authentication and perform the first scoped publication.
- [ ] Configure npm trusted publishing for `.github/workflows/release.yml`.
- [ ] Create the `v0.1.0-alpha.1` GitHub prerelease and attach verified artifacts.

## Deferred beyond the alpha

- Container execution backend.
- Additional language adapters.
- Statistical flakiness estimation.
- Optional local/BYOK explanations that cannot alter proof status.
- Hosted dashboard, GitHub App, persistent service, or numeric quality scores.
