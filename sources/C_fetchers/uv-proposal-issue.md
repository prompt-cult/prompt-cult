## Summary
Propose a repo-local, repeatable Python toolchain setup that is isolated per git worktree and safe across shared dev laptops, while leaving CI behavior unchanged.

## Problem
The current setup depends on a mix of:
- a user-global `uv` install,
- a `mise`-managed `uv` that is not the canonical shell-active binary,
- and a shared global uv cache under `~/.cache/uv`.

That combination is fragile in shared-laptop and multi-worktree setups: one corrupted cache entry or one developer’s shell state can break unrelated worktrees. The desired end state is reproducible, isolation-proof, and not dependent on any one laptop’s ambient shell setup.

## Proposal
Make the repository self-contained for local development by using repo-owned configuration only, with additive changes:
1. Pin the repo’s `uv` tool version through mise so `make init` can install the same `uv` everywhere.
2. Move uv cache location into the worktree (for example under `.tmp/`) via repo-local uv configuration, so each worktree uses its own cache.
3. Keep CI behavior functionally the same: CI should continue to run the existing `make init` / `make` / hook checks without requiring any special laptop-only setup.
4. Ensure ignore rules cover any new local cache/artifact paths so nothing worktree-specific is committed or shipped.

## Desired End State
- A clean clone or fresh worktree can run `make init` and `make` without relying on a pre-existing global uv cache.
- One developer’s uv cache corruption cannot affect another worktree.
- Local dev and CI both use the same repo logic, but CI remains environment-agnostic and does not depend on personal shell startup files.
- The solution should be explicit and durable rather than a one-off workaround.

## Constraints
- Do not change module-level `uv` usage patterns.
- Keep changes additive and focused on repo setup/tooling.
- Do not introduce special-case logic for CI beyond the existing pipeline.
- Prefer the simplest design that survives future laptop changes and new worktrees.

## Acceptance Criteria
- `make init` is sufficient to provision the local toolchain in a fresh isolated worktree.
- `make clean && make` succeeds without depending on a pre-existing global uv cache state.
- The repo’s ignore rules cover any new local cache directory introduced by the plan.
- The CI workflow still uses the current build entrypoints and does not gain laptop-specific assumptions.

## Notes
This is intentionally a technical proposal for the final steady state, not an interim workaround.
