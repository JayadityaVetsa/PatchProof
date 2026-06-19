# Contributing to PatchProof

PatchProof welcomes first-time open-source contributors.

## Before contributing

1. Read [VISION.md](VISION.md), [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), and [ARCHITECTURE.md](ARCHITECTURE.md).
2. Search existing issues and pull requests.
3. For behavior changes, open an issue describing the user problem and evidence.
4. For architecture changes, propose or update an ADR in `docs/decisions/`.

## Contribution standards

- Preserve canonical status meanings.
- Never convert uncertainty into `proven`.
- Add tests for every behavior change.
- Keep the deterministic core independent from AI services.
- Avoid hidden network calls and telemetry.
- Keep changes focused and explain tradeoffs.
- Update user-facing documentation in the same pull request.

## Pull requests

A good pull request includes:

- Problem and intended outcome.
- Reproduction or fixture.
- Design notes for non-trivial changes.
- Tests and their observed result.
- Security implications.
- Documentation and changelog impact.

Maintainers may ask contributors to split unrelated changes.

## Code review expectations

Reviews evaluate correctness, evidence, security, compatibility, clarity, and maintainability. Reviews address the work, not the contributor. AI-assisted contributions are welcome when the contributor understands, tests, and takes responsibility for the result.

## Development workflow

Install Node.js 22 or 24, enable Corepack, and run:

```console
corepack pnpm install
corepack pnpm check
corepack pnpm pack:cli
```

The test suite creates temporary Git repositories and worktrees. Python adapter execution tests additionally require a supported Python interpreter.

## Conduct and security

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately according to [SECURITY.md](SECURITY.md), not through public issues.
