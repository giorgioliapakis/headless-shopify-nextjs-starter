# Downstream foundation updates

Each real merchant migration lives in a private repository created from a signed/tagged foundation
release. Add this repository as a read-only `foundation` remote and record the applied tag in the
merchant's operational documentation. Never merge merchant source or evidence back upstream.

Merchant-owned paths are versioned in `config/foundation-update.json`. The foundation must not modify
them after the downstream contract begins:

- `config/presets/` for brand tokens and page recipes;
- `public/merchant/` for approved licensed assets;
- `components/merchant/` and `app/(merchant)/` for novel generated surfaces.

Fetch an exact reviewed tag, then create a conflict plan before any merge:

```bash
git fetch foundation --tags
pnpm foundation:update --from v0.1.0 --to v0.2.0
```

The planner requires the old tag to be an ancestor of both downstream HEAD and the new tag. It fails
closed when foundation and downstream changed the same path or when the new foundation changed a
merchant-owned path. Review dependency/Hydrogen migrations, capability changes and the release notes in
order. When the JSON plan is clean and the working tree is clean, a human or explicitly authorized agent
may apply exactly that reviewed merge:

```bash
pnpm foundation:update --from v0.1.0 --to v0.2.0 --apply
```

Run `pnpm check`, `pnpm verify:production`, the full merchant browser/parity suite and a production-like
preview afterward. Resolve conflicts deliberately in a feature branch; never overwrite merchant recipes
or assets with neutral defaults. Roll back the merge commit as one unit if the update fails.
