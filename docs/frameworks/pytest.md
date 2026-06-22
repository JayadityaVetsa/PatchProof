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

PatchProof creates a separate `.patchproof-venv` in each temporary base/head worktree, even when
commands are explicitly configured. `python`, `pytest`, and shell commands run with that environment
first on `PATH`; an unrelated active virtual environment is never reused as the proof environment.

Interpreter selection prefers a usable system installation with `venv` support. If several Python
installations exist, select one explicitly:

```powershell
$env:PATCHPROOF_PYTHON = "C:\Python311\python.exe"
patchproof check --base origin/main --head HEAD
```

```sh
PATCHPROOF_PYTHON=/usr/bin/python3.11 patchproof check --base origin/main --head HEAD
```

Use a Python version supported by both the base and head revisions. Historical bases often fail because a modern interpreter is too new; that is `inconclusive`, not proof.
