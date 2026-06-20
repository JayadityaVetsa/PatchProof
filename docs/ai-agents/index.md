# Using PatchProof with AI coding agents

PatchProof's verdict is deterministic. AI agents can operate the workflow, explain evidence, and help configure a repository, but they must not reinterpret statuses.

## Reusable prompt

```text
Use PatchProof to validate the regression test for this bug fix.

1. Run `patchproof inspect --base origin/main --head HEAD` first.
2. Explain which changed tests were selected and why.
3. Show me the commands before executing them.
4. Run `patchproof check --base origin/main --head HEAD`.
5. Report the canonical PatchProof status exactly.
6. Never describe `inconclusive`, setup failure, timeout, or unknown output as proof.
7. Do not claim the entire patch is correct when a test is `proven`.
```

This works with ChatGPT, Claude, Gemini, Codex, and other coding agents that can run local commands.

## Correct language

Say:

> PatchProof proved that the selected changed regression test fails on base and passes on head.

Do not say:

> PatchProof proved the patch has no bugs.
