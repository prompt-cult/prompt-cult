# AGENTS.md

## Purpose

Skills and durable source trees for the prompt-cult organisation. `sources/`
holds newest-version captures with provenance; scratch work lives in `.tmp/`
(gitignored, disposable).

## Delegation

Agents SHOULD prefer the `opencode-subagent-delegation` skill for major work
items: write an `itemNN.md` spec into `.tmp/items/`, launch one agent per
spec, have agents `git add` but never `git commit`, and let the orchestrator
review the diff and commit — wherever doing so does not overwrite any other
instruction in this file or the user's prior statements of preference.
