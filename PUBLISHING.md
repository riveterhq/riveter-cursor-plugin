# Publishing the Riveter Cursor plugin

The Cursor Marketplace installs the plugin from the public repository
`github.com/riveterhq/riveter-cursor-plugin`. That repository is a mirror of this
directory: nothing is edited there, and every change adds one snapshot commit of
`cursor-plugin/` on the monorepo's `main` to its `main`. None of the monorepo's commits
reach it. There is no registry upload; "publishing" is pushing the mirror.

`.github/workflows/publish-clients.yml` (`cursor-plugin-mirror` job) does the push
on every push to `main` that touches this directory or the spec: it runs
`test/check-plugin-names.mjs`, then `sdk/scripts/push-mirror-snapshot.sh` pushes the
snapshot with the `MIRROR_PUSH_TOKEN` secret (nothing when the mirror already carries
the directory's tree). Never push from an agent (see the repo git rules); the workflow
and the user do.

## Release checklist

1. Bump `version` in `.cursor-plugin/plugin.json` and `package.json` (same number)
   whenever an installed file changed (`.cursor-plugin/`, `assets/`, `commands/`,
   `install.sh`, `mcp.json`, `rules/`, `skills/`). `published-versions.yml` fails
   the push or pull request when one of those differs from the mirror at the same
   version (`sdk/scripts/check-published-versions.mjs`). `README.md`, `test/`, and
   the other repo-facing files need no bump; the mirror is refreshed either way.
2. Run the check: `pnpm --filter riveter-cursor-plugin test`.
3. Commit to the monorepo as usual and merge to `main`. The workflow pushes the
   mirror; its log names the snapshot commit.
4. Verify on the mirror that `.cursor-plugin/plugin.json` carries the new version
   and that `README.md`, `LICENSE`, and `install.sh` are present (a snapshot
   replaces the whole tree, so anything the mirror needs must live in this
   directory).

## By hand

The same push, from the monorepo root on `main`, when the workflow cannot run:

```bash
sdk/scripts/push-mirror-snapshot.sh cursor-plugin git@github.com:riveterhq/riveter-cursor-plugin.git "riveter-cursor-plugin X.Y.Z"
```

The installed copy at `~/.cursor/plugins/local/riveter` is separate from the
mirror: `bash install.sh` refreshes it from this directory.
