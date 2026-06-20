# Jest and Vitest

PatchProof detects Jest and Vitest from package metadata and common scripts. It supports:

- `test` and `it`.
- Nested `describe` and `suite`.
- Common modifiers.
- Statically named table-driven tests.
- TypeScript and JSX parsing.

Dynamic names or unsupported syntax fall back to file-level targeting with a visible diagnostic.

When auto-detection is ambiguous, configure commands explicitly:

```yaml
version: 1
adapter: javascript
execution:
  setup: [pnpm, install, --frozen-lockfile]
  targetedTest: [pnpm, vitest, run, "{test_file}", -t, "{test_id}"]
  suite: [pnpm, test]
```

PatchProof treats unknown runner output conservatively. A failure must match known assertion evidence before it may contribute to `proven`.
