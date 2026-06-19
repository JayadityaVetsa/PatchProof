# Product Design

## Design objective

PatchProof should feel like a precise lab instrument, not an AI oracle. The interface presents observations, classifications, and limitations in that order.

## Terminology

Use the canonical terms in [docs/GLOSSARY.md](docs/GLOSSARY.md). In particular:

- Say **base** and **head**, not “old” and “new” in machine-facing interfaces.
- Say **transplanted test** for head-side test changes applied to base.
- Say **proven regression test**, never “proven patch.”
- Say **inconclusive** when execution was unreliable.

## Command lifecycle

1. **Inspect:** show resolved revisions, adapter, discovered commands, and test changes.
2. **Warn:** explain that repository commands execute with the user's permissions.
3. **Confirm:** require explicit local consent unless approved by configuration or CI mode.
4. **Prepare:** create worktrees and dependencies with visible progress.
5. **Evaluate:** show concise per-test progress without streaming overwhelming logs by default.
6. **Report:** lead with the aggregate, then per-test evidence and reproduction hints.
7. **Clean:** remove temporary resources and disclose retained paths.

## Report hierarchy

Human output should answer, in order:

1. Did PatchProof complete reliably?
2. Were any head regressions observed?
3. Which tests were proven, not proven, still failing, or inconclusive?
4. What commands and revisions produced the result?
5. How can the user reproduce or debug it?

Color reinforces meaning but is never the only signal. Every status has a word and stable symbol. Output supports `NO_COLOR` and plain terminals.

## Tone

- Direct: “The test passes on base” rather than “This test may be weak.”
- Neutral: do not shame contributors or mention “AI slop.”
- Specific: distinguish assertion failures from import errors.
- Bounded: “This test distinguishes the two revisions” rather than “The fix is correct.”

## Configuration philosophy

- Zero configuration is attempted only when detection is high-confidence.
- Explicit configuration wins over detection.
- Ambiguity is surfaced with candidate choices; PatchProof does not guess silently.
- Defaults are safe and visible.
- Configuration errors fail before any repository command runs.

## Accessibility

- Statuses remain understandable without color or Unicode.
- Progress works in non-interactive and screen-reader-friendly modes.
- Tables have text alternatives in Markdown output.
- Diagnostics avoid animation-dependent meaning.
- Exit status and JSON provide automation parity with visual output.

## Branding

The public identity is professional and evidence-focused:

- Name: **PatchProof**
- Pitch: **Your tests pass. PatchProof proves they matter.**
- Avoid shields, police imagery, or adversarial contributor framing.
- Demonstrations may be playful, but reports remain respectful.
