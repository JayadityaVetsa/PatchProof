# ADR-0005: Temporary Git worktrees

- **Status:** Accepted
- **Date:** 2026-06-18

## Decision

Use detached temporary Git worktrees for base and head evaluation.

## Rationale

Worktrees preserve Git semantics, avoid altering the active checkout, and are more transparent than copying arbitrary directories.

## Consequences

PatchProof must manage locks, shallow history, cleanup, Windows filesystem behavior, and interruption recovery. A cleanup journal is required.
