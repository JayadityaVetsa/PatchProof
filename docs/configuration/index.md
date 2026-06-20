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
