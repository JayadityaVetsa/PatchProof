# Fixtures

Fixture histories are generated in temporary directories by the integration tests so Git metadata, branches, renames, and worktree cleanup are exercised exactly as users experience them.

Future fixture families will cover JavaScript and Python outcomes including `proven`, `not_proven`, `still_failing`, `inconclusive`, `no_tests`, and head-suite regressions. Fixtures must be deterministic, small, documented, and safe to execute.
