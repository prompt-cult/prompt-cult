# Week note: vanilla-pod-js, consolidated

vanilla-pod-js is the organisation's first published skill: framework-free
browser JavaScript with JTD schemas compiled ahead of time into
dependency-free validators, frozen immutable data at the trust boundary,
typed fetchers over NDJSON row streams that fail closed, and JSDoc checked
by tsc without transpiling. Skill: [SKILL.md](https://github.com/prompt-cult/prompt-cult/blob/main/skills/vanilla-pod-js/SKILL.md);
fixture: [fixture/](https://github.com/prompt-cult/prompt-cult/tree/main/skills/vanilla-pod-js/fixture).

The idea lived as a scatter of gists and repo docs — a browser-baseline
note duplicated across files, a DTO convention, two functional-fetcher
designs, a teal-for-tooling note, and a Java pickler. The consolidation ran
as a linear margin-note map-reduce: parallel mappers extracted 998 margin
notes from every version of every source, a shuffle grouped them into 892
concept keys, and a reduce produced a 743-entry universe glossary with full
provenance.

The brief came from a scrub with an explicit bar: only what directly
generalises to the vanilla-pod-js skeleton makes the cut. 240 of 743
entries survived; 503 dropped, each with a recorded reason — sibling
runtime mechanics, emitter internals, repo process. Twenty-eight of the
survivors were principles that earned their place from other languages'
sources. Seventeen contradictions in the source material — including a
file suffix spelled against its own acronym — were stopped at the Andon
line and settled by explicit ruling before synthesis.

The result ships with its own proof: a fixture whose check gate generates
validators from schemas with the real compiler, fails a fetcher closed on
the first bad row, freezes deeply, and keeps a missing switch case a
compile error. The two repeated gists that seeded the run now point here;
their histories remain in the gist revisions.
