# Frequently asked questions

## How do I verify a regression test fails before a fix?

Check out the fix branch, run `patchproof inspect --base origin/main --head HEAD`, then run `patchproof check` with the same revisions. A `proven` result means the selected changed test asserted on base and passed on head.

## How does PatchProof know which test is related to the fix?

It does not infer the bug. It selects added tests and test cases whose complete source spans overlap changed Git lines.

## Is this mutation testing?

No. Mutation testing changes production code synthetically. PatchProof uses the repository's actual base revision.

## Does `proven` mean the patch is correct?

No. It means the reported test distinguishes base from head.

## Does PatchProof send code to an AI service?

No. The core requires no model, API key, telemetry, or hosted service.

## Can PatchProof run on fork pull requests?

Yes, on ephemeral runners using `pull_request`, read-only permissions, and no secrets.
