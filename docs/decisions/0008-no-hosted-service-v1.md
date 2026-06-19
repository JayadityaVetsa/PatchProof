# ADR-0008: No hosted service in v1

- **Status:** Accepted
- **Date:** 2026-06-18

## Decision

V1 has no PatchProof-hosted backend, account system, telemetry service, or repository storage.

## Rationale

Local and CI execution minimizes cost, privacy risk, operations, and barriers to contribution.

## Consequences

GitHub integration is Action-based. Cross-repository dashboards, persistent history, and GitHub App features are deferred.
