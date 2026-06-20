# GitHub Action

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
      - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd
        with:
          fetch-depth: 0
      - uses: JayadityaVetsa/PatchProof@<full-immutable-commit-sha>
        with:
          config: .patchproof.yml
          upload-report: "true"
          fail-on: non-proven
```

The Action reads trusted base/head SHAs from the `pull_request` payload, writes a Markdown summary, emits status/count outputs, and optionally uploads redacted JSON.

## Fork safety

- Use `pull_request`, never `pull_request_target`, to execute contributor code.
- Keep permissions read-only.
- Do not expose secrets.
- Prefer GitHub-hosted ephemeral runners.
- Pin third-party Actions and PatchProof itself to full commit SHAs.

PatchProof worktrees isolate Git state, not operating-system privileges.
