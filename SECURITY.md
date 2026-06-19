# Security Policy

## Critical execution warning

PatchProof runs dependency setup and test commands from repositories. Those commands execute code with the permissions of the local user or CI runner. A temporary Git worktree prevents accidental source-tree modification; it is **not a security sandbox**.

Do not run PatchProof on untrusted code on a machine containing sensitive credentials or access to sensitive networks.

## Supported versions

Before the first release, no version is supported. After release, the latest minor release will receive security fixes; the exact policy will be listed here.

## Reporting a vulnerability

Use GitHub private vulnerability reporting when the repository enables it. Until then, contact the maintainer through a private address added before public launch. Do not include exploit details in a public issue.

Please include:

- Affected version or commit.
- Reproduction steps.
- Expected and observed impact.
- Relevant platform and configuration.
- Suggested mitigation, if known.

The project will acknowledge reports promptly, investigate, coordinate a fix and disclosure date, and credit reporters who wish to be named.

## Threat model highlights

- Malicious test/setup commands.
- Shell or workflow-command injection.
- Secret leakage through logs.
- Path traversal or symlink escape.
- Destructive cleanup targeting the wrong directory.
- Compromised third-party dependencies or Actions.
- Untrusted fork code on persistent self-hosted runners.
- False `proven` caused by misclassified infrastructure failure.

## GitHub Actions guidance

- Use the `pull_request` event for untrusted PR code.
- Do not use `pull_request_target` to check out and execute PR code.
- Set `permissions: contents: read`.
- Do not expose repository secrets to proof jobs.
- Prefer GitHub-hosted ephemeral runners for public repositories.
- Pin third-party actions to full commit SHAs.

GitHub's [secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) explains least privilege, immutable action pins, and the risks of self-hosted runners.

## Security boundaries

V1 provides consent, isolation of working copies, careful process invocation, bounded/redacted output, and cleanup validation. V1 does not provide OS-level containment. Container execution may be added later but must not be marketed as a complete sandbox without an independent security review.
