# ADR-0001: TypeScript and pnpm

- **Status:** Accepted
- **Date:** 2026-06-18

## Decision

Implement PatchProof in TypeScript using pnpm workspaces.

## Rationale

TypeScript supports cross-platform CLI development, JavaScript GitHub Actions, shared domain types, and approachable contribution. pnpm provides efficient workspace management and strict dependency boundaries.

## Consequences

Node.js becomes a runtime requirement for the CLI. Release packaging must make installation simple, and TypeScript types must not substitute for runtime validation.
