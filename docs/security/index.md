# Security model

PatchProof executes repository commands with the current user or CI runner permissions. Worktrees protect the active checkout but are not a sandbox.

- Inspect commands before consenting locally.
- Run untrusted pull requests only on ephemeral, secret-free runners.
- Use read-only GitHub permissions.
- Never use `pull_request_target` to execute contributor code.
- Treat dependency installation as arbitrary code execution.
- Pin Actions to immutable SHAs.

PatchProof blocks path traversal and production-file transplant, bounds logs, neutralizes workflow commands, and redacts common secret/path forms. See the repository [security policy](https://github.com/JayadityaVetsa/PatchProof/blob/main/SECURITY.md) for threat details and private vulnerability reporting.
