# Privacy

PatchProof has no telemetry, hosted account, required AI service, API key, or hidden proof-classification network call.

Reports are redacted by default:

- Repository, worktree, home, and temporary roots become placeholders.
- Common credential assignments and secret environment values are removed.
- Logs are bounded.
- GitHub workflow commands are neutralized.
- Repository paths are relative.

Project output can contain domain-specific sensitive data that generic redaction cannot recognize. Review artifacts before sharing them.
