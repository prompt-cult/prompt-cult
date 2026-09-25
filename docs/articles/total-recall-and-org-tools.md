# Total-recall and the tools of prompt-cult

total-recall is the organisation's memory tool: an MCP server that compacts
agent sessions with Mercury 2.5 and mines their rollout logs with a
full-text index. Compaction returns the state of a session — accomplished,
current work, files, next steps, key decisions. Search runs over per-session
shadow indexes; a session profile reports size, role counts, and events.

It earned its keep in the vanilla-pod-js run. Three mapper agents died on
API errors after writing partial notes, and their findings never reached a
report. The audit agent used total-recall to find the dead rollouts, read
their reasoning, and recover a real one: a divergence between two copies of
a codegen spec that one agent had spotted mid-reasoning and never written
down. The audit then double-checked it against the files by direct diff and
confirmed it. Errors of commission caught; nothing papered over.

Other tools in the org:

- [json-type-definition-RFC-8927](https://github.com/prompt-cult/json-type-definition-RFC-8927)
  — jtd-codegen, the ahead-of-time JTD validator generator for JavaScript,
  Lua, Python, Rust, and WASM; the tool the vanilla-pod-js skill builds on.
- [opencode-subagent-delegation](https://github.com/prompt-cult/opencode-subagent-delegation)
  — the delegation process this whole pipeline ran on: one spec per item,
  one agent per spec, agents stage and never commit, the orchestrator
  reviews and commits. Tool-agnostic by design.
- [vps-grapevine](https://github.com/prompt-cult/vps-grapevine) — a
  long-running remote agent for managing EU-based VPS hosts.
- [git-veil](https://github.com/prompt-cult/git-veil) — encryption of your
  secrets within your git repo.
- [ssh-tunnel-manager](https://github.com/prompt-cult/ssh-tunnel-manager) —
  a macOS menu bar app for managing SSH port forwards.
- Forks kept for work: codex, opencode, mistral-vibe.

One repo per tool, plain and findable. The skills live here; the tools
live beside them.
