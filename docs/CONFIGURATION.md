# Configuration

PatchProof will read `.patchproof.yml` from the repository root unless `--config` is supplied.

## Proposed v1 shape

```yaml
version: 1

base: main
adapter: javascript

execution:
  approved: false
  setup: pnpm install --frozen-lockfile
  targetedTest: pnpm vitest run "{test_file}"
  suite: pnpm test
  timeoutSeconds: 120
  suiteTimeoutSeconds: 900
  keepWorktrees: false

tests:
  include:
    - "**/*.test.ts"
  exclude:
    - "**/generated/**"
  support:
    - "test/helpers/**"

report:
  format: text
  output: null
```

Python example:

```yaml
version: 1
adapter: python
execution:
  setup: python -m pip install -e ".[test]"
  targetedTest: python -m pytest "{test_id}"
  suite: python -m pytest
```

## Precedence

Highest to lowest:

1. CLI arguments.
2. Environment variables explicitly documented by PatchProof.
3. `.patchproof.yml`.
4. Adapter defaults.

Security-sensitive defaults are not weakened by ambiguous detection.

## Validation

- Unknown top-level keys are errors in v1.
- `version` is required and must equal `1`.
- Adapter must be supported or omitted for detection.
- Commands must be non-empty.
- Timeouts must be positive and bounded.
- Paths are repository-relative and cannot escape the repository.
- Placeholders must be from the documented set.
- Invalid configuration fails before consent or command execution.

## Command placeholders

- `{test_id}` — adapter-normalized test identifier.
- `{test_file}` — repository-relative test file.
- `{worktree}` — managed worktree root, when needed.

Values are passed safely as arguments where possible. PatchProof must not substitute untrusted values into shell source without robust platform-aware handling.

## Changed-test detection

Adapters combine Git diff information with include/exclude patterns. Added and materially changed test cases are eligible. Deleted-only tests are reported but cannot be proven. Support paths explicitly identify helpers that may be transplanted; production paths must never be included.

## Future compatibility

The version field permits schema evolution. V1 rejects newer versions with an upgrade message instead of guessing.
