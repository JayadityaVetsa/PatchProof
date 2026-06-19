# ADR-0006: Host execution with explicit consent

- **Status:** Accepted
- **Date:** 2026-06-18

## Decision

V1 runs repository setup and test commands on the host. Local interactive runs require a clear warning and confirmation unless explicitly pre-approved. CI runs non-interactively.

## Rationale

Requiring containers would exclude users and complicate cross-platform adoption, while silently executing repository code would be unsafe.

## Consequences

Worktrees are isolation, not sandboxing. Security documentation must be prominent. Container execution remains a future backend.
