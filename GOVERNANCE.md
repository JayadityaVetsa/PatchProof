# Governance

## Current model

PatchProof begins as a maintainer-led open-source project. The founding maintainer is responsible for scope, releases, security response, and community standards until a broader maintainer group is established.

## Decision making

- Small implementation decisions are resolved through pull-request review.
- User-visible semantics, public interfaces, dependencies with significant risk, and architecture changes require an Architecture Decision Record.
- Decisions prioritize correctness, security, evidence, and maintainability over feature count.
- When consensus is unavailable, the lead maintainer makes and documents the decision.

## Roles

### Contributor

Anyone submitting issues, documentation, tests, code, design, or research.

### Reviewer

A trusted contributor who can provide formal review but cannot independently publish releases.

### Maintainer

A contributor with merge authority and responsibility for triage, review, roadmap stewardship, and conduct enforcement.

### Release manager

A maintainer authorized to prepare and publish a release using the documented checklist.

## Becoming a maintainer

Candidates should demonstrate sustained constructive contribution, sound technical judgment, respectful review, security awareness, and reliability. Existing maintainers approve additions and document repository permissions.

## Releases

- Releases use semantic versioning.
- Public status semantics and JSON schema changes require compatibility review.
- Security releases may use an expedited private process.
- No person should author, solely approve, and publish a security-sensitive release when another maintainer is available.

## Project assets

Domains, package namespaces, social accounts, signing keys, and organization ownership should be documented and controlled by at least two maintainers when the project grows.
