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
- uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd
  with:
    fetch-depth: 0
```
