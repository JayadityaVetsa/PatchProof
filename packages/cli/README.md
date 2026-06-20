# @jayadityavetsa/patchproof

PatchProof checks whether a changed regression test fails against a base revision and passes against the proposed revision.

```console
npm install --global @jayadityavetsa/patchproof
patchproof inspect --base origin/main
patchproof check --base origin/main
```

PatchProof runs repository setup and test commands with your user permissions. Review the displayed execution plan before approving local runs.

Full documentation, GitHub Action usage, status meanings, compatibility, and security guidance are available at [github.com/JayadityaVetsa/PatchProof](https://github.com/JayadityaVetsa/PatchProof).
