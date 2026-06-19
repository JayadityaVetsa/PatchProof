# GitHub Action Specification

## Intended use

```yaml
name: PatchProof

on:
  pull_request:

permissions:
  contents: read

jobs:
  patchproof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<full-commit-sha>
        with:
          fetch-depth: 0
      - uses: patchproof/patchproof@<full-commit-sha>
        with:
          config: .patchproof.yml
```

Published examples may also show version tags for convenience, but security documentation recommends full commit SHAs.

## Inputs

- `config` — configuration path.
- `base` and `head` — optional explicit refs.
- `adapter` — optional override.
- `format` — summary/report preference.
- `upload-report` — whether to upload JSON evidence.
- `fail-on` — policy using canonical aggregate states, without redefining them.

## Outputs

- `status` — canonical aggregate.
- `report-path` — generated JSON path.
- `proven-count`, `not-proven-count`, `still-failing-count`, `inconclusive-count`.

## Behavior

- Derive base/head SHAs from trusted event fields for `pull_request`.
- Validate that required commits exist.
- Run non-interactively with consent recorded as `ci`.
- Write a Markdown job summary.
- Optionally upload the JSON report with bounded retention.
- Set the process conclusion according to CLI exit codes and `fail-on` policy.

## Security

- The Action executes PR code and must be treated as untrusted.
- It must not request write permissions.
- It must not require secrets.
- It must not combine `pull_request_target` privileges with checkout/execution of fork code.
- Inputs and event values are arguments/data, never shell fragments.
- Workflow commands in child-process output must be neutralized before logging.
- Public repositories should use ephemeral GitHub-hosted runners, not persistent self-hosted runners.

## Pull-request comments

Direct PR comments are out of scope for v1 because they require write permissions or a separate privileged workflow. The v1 interface is the check conclusion, job summary, logs, and artifact.

## Checkout requirements

Full history is recommended. If base objects are unavailable, PatchProof emits `inconclusive` with exact fetch guidance; it does not silently compare against an alternative revision.
