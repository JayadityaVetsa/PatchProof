# Troubleshooting

## Base and head are identical

Check out the feature branch and fetch history:

```sh
git fetch origin
git switch <feature-branch>
patchproof inspect --base origin/main --head HEAD
```

## Setup failed

PatchProof reports the redacted command, exit code, and bounded output. Check interpreter versions, registry access, native build requirements, and `.patchproof.yml`.

## npm cannot find a local tarball

Relative paths are resolved from the current directory. Prefer the public package:

```sh
npm install --global @jayadityavetsa/patchproof@alpha
```

## Shallow history

Fetch full history in CI:

```yaml
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
  with:
    fetch-depth: 0
```
