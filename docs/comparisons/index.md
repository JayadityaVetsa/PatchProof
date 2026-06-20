# Compared with adjacent tools

PatchProof complements ordinary CI, coverage, mutation testing, and test-impact analysis.

| Tool category        | Primary question                                                        |
| -------------------- | ----------------------------------------------------------------------- |
| Ordinary CI          | Does the current revision pass its test suite?                          |
| Patch/diff coverage  | Did tests execute changed lines?                                        |
| Mutation testing     | Do tests detect generated code mutations?                               |
| Test-impact analysis | Which tests are likely relevant to changed code?                        |
| PatchProof           | Does the submitted changed test fail on the real base and pass on head? |

These tools can be used together. PatchProof does not claim broader correctness than its base/head evidence supports.
