# Tripwire API — Honest Current Pattern

## Status

This is the current implemented pattern in the repo.
It is not the earlier 180-line rewrite sketch.

The live canonical example today is:

- `margin_monitor_citi_rates_history_vw`
- API route: `/v1/api/views/margin_monitor_citi_rates_history_vw`

## The Real Pattern

The current shape is:

```text
Open Data Contract YAML
  -> generated SQL view artifact
  -> generated JTD / JS validator / JSDoc / Python serde artifacts
  -> handwritten thin FastAPI route
  -> handwritten screen fetch assembly
  -> generated validator used at screen/runtime boundary
```

So the system is **contract-generated at the artifact layer** but still uses a
**handwritten thin adapter** at the backend and usually a **handwritten screen
fetcher** at the screen edge.

## Canonical Example

The best current example is the margin monitor Citi history path.

### Contract / generation inputs
- `contracts/tripwire/margin_monitor_citi_rates_history_vw.yaml`
- `tripwire/data/99_margin_monitor_citi_rates_history_vw.sql.j2`

### Generator
- `tripwire/bin/generate_view_contracts.py`
- `tripwire/Makefile`

### Generated outputs
- `tripwire/target/views/99_margin_monitor_citi_rates_history_vw.sql`
- `tripwire/target/_generated/view_contracts/margin_monitor_citi_rates_history_vw.jtd.json`
- `tripwire/target/_generated/view_contracts/margin_monitor_citi_rates_history_vw.validator.mjs`
- `tripwire/target/_generated/view_contracts/margin_monitor_citi_rates_history_vw.fetcher.mjs`
- `tripwire/target/_generated/view_contracts/margin_monitor_citi_rates_history_vw.jsdoc.js`
- `tripwire/tripwire/_generated_view_contracts/margin_monitor_citi_rates_history_vw.pg_serde.py`

### Backend adapter
- `tripwire/tripwire/api/sql/citi_rates_history.sql`
- `tripwire/tripwire/api/server.py`

### Screen-side actual usage
- `tripwire/src/screens/margin_monitor.runtime.js`
- `tripwire/src/screens/margin_monitor.html.js`

## Request / Response Path

### Runtime wiring
`margin_monitor.runtime.js` sets:

- `/v1/api/views/margin_monitor_citi_rates_history_vw`

and passes that into an assembled fetcher.

### Screen fetcher
The actual screen does **not** directly use the generated `.fetcher.mjs`.
Instead it uses a handwritten functional fetcher assembly that:

- builds the request path
- fetches JSON or NDJSON
- validates rows with the generated validator
- maps the flat row shape into screen-specific nested state

### Backend route
`tripwire/tripwire/api/server.py` exposes a thin route that:

- selects a fixed SQL file
- substitutes a fixed view name
- streams rows back

The route is handwritten and intentionally boring.

### SQL
The query SQL is a small projection/order file under:

- `tripwire/tripwire/api/sql/`

The actual DB view definition comes from the generated view SQL under:

- `tripwire/data/99_*.sql.j2`

## Makefile / Build Flow

The details are not ad hoc; the normal Tripwire Makefile path builds them.

### Generation step
`tripwire/Makefile` runs:

- `uv run python bin/generate_view_contracts.py`

That produces:

- SQL view artifacts in `tripwire/target/views/`
- JTD / validator / fetcher / JSDoc artifacts in `tripwire/target/_generated/view_contracts/`
- Python pg-serde artifacts in `tripwire/tripwire/_generated_view_contracts/`

### Screen availability
The same Makefile copies generated web artifacts into the web-visible tree:

- `target/_generated/view_contracts/` -> `target/www/_generated/view_contracts/`

That is why screen code can load generated validators from paths like:

- `/v1/_generated/view_contracts/margin_monitor_citi_rates_history_vw.validator.mjs`

### Root build integration
At repo-root `make`, Tripwire generation runs inside the normal build cycle, so
these artifacts are part of the regular packaged output rather than a special lane.

## Validation / Type Lanes

### Open Data Contract lane
The ODC YAML is the schema source for generated view artifacts.

### JSON Type Definition lane
`generate_view_contracts.py` emits:

- `*.jtd.json`

These are part of the normal generation path, not a side experiment.

### JS validator lane
`generate_view_contracts.py` emits:

- `*.validator.mjs`

The live margin monitor screen imports these validators lazily and validates fetched rows before mapping them into runtime state.

### JSDoc lane
`generate_view_contracts.py` emits:

- `*.jsdoc.js`
- `contract_row_source.jsdoc.js`

These are the JSDoc boundary types used for strict `checkJs` / TSC-adjacent build-time discipline.

### Python serde lane
`generate_view_contracts.py` emits:

- `*.pg_serde.py`

The backend can use the generated row-to-JSONable mapping via `VIEW_PG_SERDE` when a route passes `view_name=...` into the shared streaming response path.

## Test / Proof Lanes

The current repo has explicit proof for generation.

### Generation proof
- `tripwire/tests/test_view_contract_generation.py`

That test proves the generator emits, for the canonical view and peers:

- SQL migration/view artifact
- JTD schema
- JS validator module
- JSDoc module
- Python pg-serde module
- generated index exports

### JSDoc boundary proof
`tripwire/Makefile` also has a dedicated boundary lane:

- `make jsdoc-boundary-check`

and the normal `make test` path includes that lane.

### Screen/runtime proof
The live screen code references the generated validator path directly, so if the generation/copy-up path breaks, the screen boundary breaks honestly.

## What Is True Today

### True
- Open Data Contracts exist and drive generated artifacts.
- JTD generation is part of the normal Makefile flow.
- JSDoc generation is part of the same flow.
- Python pg-serde generation exists for view-backed rows.
- Thin backend routes are still handwritten.
- Screen fetch assembly is still usually handwritten.
- Generated validators are available for runtime/build-time use.
- The live Citi path is the best “real current pattern” example.

### Not true
- The backend is not a 180-line rewrite.
- The server is not fully generated from contracts.
- The screen is not wired directly to generated fetchers in the main margin monitor path.
- The handwritten adapter layer has not been deleted.

## Invariant Chain

```text
Postgres relation
  -> generated view SQL
  -> migrate installs relation
  -> FastAPI thin adapter exposes route
  -> screen fetch assembly calls route
  -> generated JS validator checks row shape
  -> screen maps row into local runtime model
```

## Design Rule

If you are adding a new simple view-backed endpoint today, follow this pattern:

1. add a contract YAML under `contracts/tripwire/`
2. add a `tripwire/data/99_*.sql.j2` view template
3. let the normal generation flow emit SQL/JTD/validator/JSDoc/pg-serde artifacts
4. add a thin SQL file in `tripwire/tripwire/api/sql/`
5. add a thin handwritten route in `tripwire/tripwire/api/server.py`
6. only add screen wiring if the screen actually needs it

## Honesty Rule

The source of truth is the code and generated artifacts in the repo.
This note is a map, not a substitute for reading the files.


---

## Historical footnote

Content present in earlier revisions of this document but absent from the
newest version, preserved verbatim from the capture (pairwise reduction
newest → oldest). Each chunk is labelled with the revision it last appeared
in. Nothing here is current guidance — it is lost-idea recovery for the later
extraction passes.

Pairwise reduction over all 1 earlier revisions found no content absent from the newest version.
