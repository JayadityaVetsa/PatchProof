# Report Format

## Design

All reporters consume a single result model. Text and Markdown optimize readability; JSON is the automation contract.

## Canonical statuses

Per-test:

- `proven`
- `not_proven`
- `still_failing`
- `inconclusive`

Aggregate-only:

- `no_tests`
- `regression`
- `error`

## JSON schema version 1

```json
{
  "schemaVersion": 1,
  "tool": { "name": "patchproof", "version": "0.1.0-alpha.2" },
  "repository": {
    "root": "<repository>",
    "baseSha": "41e8c91...",
    "headSha": "a02f7d4...",
    "dirtyOverride": false
  },
  "execution": {
    "adapter": "javascript",
    "consent": "interactive",
    "startedAt": "2026-06-18T20:00:00Z",
    "durationMs": 4210
  },
  "tests": [
    {
      "id": "tests/divide.test.ts::accepts boundary",
      "file": "tests/divide.test.ts",
      "status": "proven",
      "selection": {
        "changedRanges": [{ "startLine": 12, "endLine": 14 }],
        "sourceRange": { "startLine": 10, "endLine": 16 },
        "reason": "Changed lines overlap the test's source span."
      },
      "base": { "outcome": "assertion_failure", "exitCode": 1, "durationMs": 900 },
      "head": { "outcome": "pass", "exitCode": 0, "durationMs": 700 },
      "diagnostics": []
    }
  ],
  "suite": { "status": "pass" },
  "aggregate": "proven",
  "limitations": ["Proof applies only to the reported tests and revisions."]
}
```

## Evidence requirements

Each executed command records an executable/argument representation, working-directory role, duration, exit state, normalized outcome, and bounded/redacted output or artifact reference. Reports may omit noisy detail from default human output but not from JSON evidence.

## Diagnostics

Diagnostics have stable codes, severity, summary, detail, and remediation. Example codes:

- `PP_CONFIG_INVALID`
- `PP_GIT_SHALLOW`
- `PP_TEST_TRANSPLANT_FAILED`
- `PP_BASE_INFRASTRUCTURE_FAILURE`
- `PP_HEAD_SUITE_REGRESSION`
- `PP_CLEANUP_INCOMPLETE`

## Human output

Every human report contains:

- Resolved base/head.
- Aggregate word, not only color/icon.
- Counts by status.
- Per-test status and reason.
- Suite health.
- Limitations.
- Reproduction/debug hint.

## Compatibility

- `schemaVersion` changes only for incompatible JSON changes.
- Fields may be added compatibly within a version.
- Consumers must ignore unknown fields.
- Canonical status strings do not change without a major-version decision.
- Paths and logs that could reveal secrets are redacted according to policy.
- Repository, worktree, temporary, and home paths use stable placeholders. Debug reports remain redacted.
