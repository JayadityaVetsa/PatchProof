# Statuses and exit codes

| Status          | Base                       | Head              | Meaning                                       |
| --------------- | -------------------------- | ----------------- | --------------------------------------------- |
| `proven`        | Assertion failure          | Pass              | The changed test distinguishes the patch.     |
| `not_proven`    | Pass                       | Pass              | The test already passed before the patch.     |
| `still_failing` | Assertion failure          | Assertion failure | The implementation does not satisfy the test. |
| `inconclusive`  | Infrastructure uncertainty | Any               | PatchProof cannot make a trustworthy claim.   |
| `no_tests`      | —                          | —                 | No eligible changed test was selected.        |

Suite comparison can additionally report `healthy`, `improved`, `pre_existing_failure`, `regression`, or `inconclusive`.

The CLI uses stable nonzero exit codes for policy-relevant outcomes. See the [CLI reference](/cli/) for the exact mapping.

The central safety invariant is:

> A timeout, crash, import error, setup failure, collection failure, or unknown runner output can never become `proven`.
