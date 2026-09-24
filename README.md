# prompt-cult

The prompt-cult organisation's working repository: skills, documentation,
sessions, and articles. Each skill is a directory under `skills/` with a
`SKILL.md` run-through and, where applicable, a runnable fixture that
proves every claim in the skill.

## Skills

| Skill | What it is | Entry point |
|---|---|---|
| vanilla-pod-js | Framework-free browser JavaScript with JTD-validated, frozen data at the trust boundary, typed fetchers over NDJSON row streams, and type checking without transpiling | [skills/vanilla-pod-js/SKILL.md](skills/vanilla-pod-js/SKILL.md) |

vanilla-pod-js is the first of many. Each skill follows the same shape:
a how-to run-through in `SKILL.md`, a green fixture that proves the
claims, and a provenance chain kept in the organisation's working notes.

## Tooling this organisation maintains

- [json-type-definition-RFC-8927](https://github.com/prompt-cult/json-type-definition-RFC-8927) —
  ahead-of-time RFC 8927 JTD code generator (jtd-codegen) with
  compatibility suites for JavaScript, Lua, Python, Rust, and WASM.

## Related organisations

- [lua-lunet](https://github.com/lua-lunet) — Lua and LuaJIT tooling in
  the same constellation.

## Site

The published catalog lives at
<https://prompt-cult.github.io/prompt-cult/> (served from `docs/`).

## Working conventions

- Major work items are delegated to subagents — one spec per item, one
  agent per spec, agents stage their work and never commit, the
  orchestrator reviews the diff and commits. No specific agent tool is
  mandated; the process is documented at
  [opencode-subagent-delegation](https://github.com/prompt-cult/opencode-subagent-delegation)
  (repository name is historical). See `AGENTS.md`.
- Scratch work lives in `.tmp/`, which is gitignored and disposable.
- `sources/` holds newest-version captures with provenance.
