# ADR-0003: CLI and GitHub Action

- **Status:** Accepted
- **Date:** 2026-06-18

## Decision

Ship a local CLI and GitHub Action in v1, both using the same core engine.

## Rationale

The CLI supports development and reproduction; the Action provides pull-request feedback where maintainers work.

## Consequences

Results and exit semantics must remain identical across interfaces. Direct PR comments are deferred to avoid write permissions and hosted infrastructure.
