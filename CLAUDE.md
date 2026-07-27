# Claude Code adapter

Read and follow `AGENTS.md`. It is the single instruction source for every agent working in this
repository, and nothing here overrides it.

Workflows live in `.agents/workflows/`; start with `foundation-work.md`. Skills are canonical in
`.agents/skills/` and are mirrored into `.claude/skills/` by `pnpm skills:sync`.

Do not invent host-specific safety, approval or completion behaviour. The commands, checks and
outcomes are shared with every other agent host.
