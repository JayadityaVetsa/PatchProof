# Installation and first proof

## Requirements

- Git.
- Node.js 22 or 24.
- A repository using pytest, Jest, or Vitest.
- Two different Git revisions: a base and a head.

## Install

::: code-group

```powershell [Windows]
npm install --global @jayadityavetsa/patchproof@alpha
patchproof --version
```

```sh [macOS / Linux]
npm install --global @jayadityavetsa/patchproof@alpha
patchproof --version
```

```sh [No global install]
npx --yes @jayadityavetsa/patchproof@alpha inspect --base origin/main --head HEAD
```

:::

## Run safely

```sh
git fetch origin
patchproof inspect --base origin/main --head HEAD
patchproof check --base origin/main --head HEAD
```

`inspect` reads Git and source files but does not install dependencies or run project commands. `check` shows its command plan and asks for consent before execution.

Do not run from `main` while comparing `main` to itself. Check out the feature branch first.

## Read the result

- `proven`: the test failed as an assertion on base and passed on head.
- `not_proven`: the test passed on both revisions.
- `still_failing`: the test asserted on both revisions.
- `inconclusive`: execution was not trustworthy.

Continue with [test selection](/selection/) and [statuses](/statuses/).
