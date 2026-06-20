# pytest

PatchProof detects `pyproject.toml`, `pytest.ini`, `setup.cfg`, or `setup.py`, then discovers:

- `test_*` functions.
- Test classes and methods.
- Async tests.
- Decorated and parametrized tests.

The complete decorated source span is used for changed-line selection. Dynamic generation falls back to the file.

Recommended explicit setup:

```yaml
execution:
  setup: [python, -m, pip, install, -e, ".[test]"]
  targetedTest: [python, -m, pytest, -q, "{test_id}"]
  suite: [python, -m, pytest, -q]
```

Use a Python version supported by both the base and head revisions. Historical bases often fail because a modern interpreter is too new; that is `inconclusive`, not proof.
