# Custom Cloud Images

Discover flags and side effects with `bivouac manifest`. Image commands are DigitalOcean-specific; all support `--json`.

For inspection or a local-only Packer bundle:

```bash
bivouac image list --tag my-dev --json
bivouac image generate --tag my-dev
```

Generation needs `pkl`, makes no cloud calls, and writes `./bivouac-image` by default. Generate/build config selection is explicit `--config <file>`, otherwise the project config, otherwise personal `base.pkl`. Invalid existing configs fail rather than falling back. `--config` and `--repo` are mutually exclusive; `--name` does not apply. Both refuse a nonempty output directory.

Before building, explain and confirm the effects: a billed temporary Droplet and snapshot, config writeback, and automatic pruning of older snapshots. Builds need `pkl`, `packer`, and a local DigitalOcean token; bivouac does not install Packer.

```bash
bivouac image build --tag my-dev --no-prune --json
```

Use `--no-prune` to retain all images unless retention is explicitly agreed. Default retention keeps the newest plus one previous image per tag/region/architecture; `--keep-previous` changes that and cannot be combined with `--no-prune`. A successful build sets `image = "tag:my-dev"` in the selected config. Symlinked, read-only, Nix-store, or expression-valued configs are left untouched with a suggested line to add.

Builds evaluate arbitrary Nix with network access: use trusted configurations. Secrets embedded in Nix store paths remain in snapshots; review bundles before sharing. Provider credentials stay local to Packer and launch-time credentials are not loaded into builds. Builds support `x86_64` only, start from stock Ubuntu, and reject local-path or authenticated private flake inputs.

For promotion or retention:

```bash
bivouac image tag <image-id> stable
bivouac image prune --tag my-dev --dry-run
```

Tagging a ready Bivouac image makes it eligible for that tag's retention. Preview pruning, confirm scope and deletions, then use `--yes` only with explicit approval when running noninteractively. Foreign or non-ready images are excluded; prune rechecks each image and stops on uncertainty. Serialize builds/prunes sharing a tag/region/architecture.

Launch with `image = "tag:<tag>"`, a numeric image ID, or a stock slug. Custom images must be ready Bivouac snapshots matching region, architecture, shell, and disk requirements; `up` fails rather than falling back or building. Provisioning still runs at launch.

On failure inspect `phase`, `image_created`, `image_id`, and `cleanup` in JSON. A nonzero build may already have created a usable snapshot or updated config: inspect before rebuilding. Retry failed pruning separately. Interrupted Packer runs may leave billed resources; inspect the reported cleanup guidance.
