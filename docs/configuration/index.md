# Configuration

PatchProof reads `.patchproof.yml` from the repository root.

```yaml
version: 1
adapter: python
projectRoot: .

execution:
  setup: [python, -m, pip, install, -e, ".[dev]"]
  targetedTest: [python, -m, pytest, -q, "{test_id}"]
  suite: [python, -m, pytest, -q]
  timeoutSeconds: 120
  suiteTimeoutSeconds: 900

tests:
  include: ["tests/**/test_*.py"]
  exclude: ["tests/generated/**"]
  support: ["tests/helpers/**"]
  expectedFailures:
    "tests/test_orders.py::test_rejects_negative_quantity":
      type: AssertionError
      message: "negative quantity was accepted"
      contains: "negative quantity"

report:
  format: text
  output: null
```

Argument arrays are preferred. String commands are trusted shell commands and are displayed before local consent.

Placeholders:

- `{test_id}`: adapter-normalized test identifier.
- `{test_file}`: repository-relative test file.
- `{worktree}`: managed worktree root.

Unknown keys are errors. Paths cannot escape the repository. Use the published [JSON Schema](/patchproof.schema.json) for editor validation.

## Reason-sensitive proof

`tests.expectedFailures` is optional and keyed by the exact discovered test ID shown by `patchproof inspect`. When configured, `proven` requires an exactly attributed base assertion with the configured case-sensitive `type` and `message`, followed by a passing head run.

`contains` is diagnostic-only: a substring match produces `not_proven`, never `proven`. Missing, ambiguous, or truncated reason evidence is `inconclusive`. Expected or observed reason text is never copied into reports; reports contain bounded diagnostic codes only. Rules for undiscovered tests fail before commands execute. Tests without rules keep the category-only behavior.
