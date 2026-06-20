# Security Policy

## Supported versions

During the public alpha, security fixes are provided for the newest `0.1.x` prerelease only. Older prereleases may be superseded rather than patched.

## Report vulnerabilities privately

Use GitHub's **Report a vulnerability** button in the repository Security tab. Do not publish exploit details in an issue, discussion, pull request, or workflow log.

Include:

- Affected version or commit.
- Reproduction steps.
- Expected and observed impact.
- Platform and relevant configuration with secrets removed.
- A suggested mitigation, if available.

## Critical execution boundary

PatchProof executes repository dependency installation and test commands with the permissions of the local user or CI runner. Temporary Git worktrees isolate working copies; they are not an operating-system sandbox.

Do not run untrusted code on a workstation or persistent runner with secrets, privileged credentials, sensitive files, or access to sensitive networks.

For public pull requests:

- Use `pull_request`, never `pull_request_target` with contributor code.
- Use `permissions: contents: read`.
- Do not provide repository or environment secrets.
- Prefer ephemeral GitHub-hosted runners.
- Pin Actions to full commit SHAs.

## Threat model

PatchProof treats these as security-sensitive:

- Malicious setup, package-manager, test, and shell commands.
- Shell argument and command-template injection.
- GitHub workflow-command injection through subprocess output.
- Secret, credential, local username, home-directory, and temporary-path leakage.
- Path traversal, absolute paths, symlinks, and support-file escape.
- Cleanup targeting the active checkout or arbitrary directories.
- Partial worktree creation, interruption, timeout, and orphan processes.
- Compromised dependencies or mutable third-party Actions.
- Fork pull requests receiving credentials.
- Syntax, import, collection, crash, timeout, or infrastructure failures being mislabeled `proven`.

## Built-in mitigations

- Explicit local execution consent.
- Argument-vector commands where possible.
- Bounded execution time and output.
- Process-tree termination.
- Detached temporary worktrees and cleanup journaling.
- Test/support allowlists and repository-relative path validation.
- Privacy-redacted reports and neutralized workflow commands.
- Conservative evidence classification: uncertainty becomes `inconclusive`.
- No telemetry, account, hosted backend, required AI, or proof-classification network service.

PatchProof cannot guarantee that arbitrary repository output contains no domain-specific secrets. Review artifacts before sharing them.
