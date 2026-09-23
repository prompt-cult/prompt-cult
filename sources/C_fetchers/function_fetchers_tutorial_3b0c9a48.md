# Functional Fetchers: Widget View Tutorial

How to add a new screen backed by a Postgres view, following the
honest kernel pattern. Two phases: build-time generation, then
browser-time functional fetching.

## Build-Time Pipeline

```mermaid
sequenceDiagram
    participant Author as You
    participant ODC as contracts/tripwire/<br/>widget_vw.yaml<br/>(ODC v3.0)
    participant CLI as datacontract-cli<br/>(off-the-shelf)
    participant DB as Postgres<br/>widget_vw
    participant ODC2JTD as odc-to-jtd<br/>(proprietary)
    participant JTD as generated/jtd/<br/>widget_vw.jtd.json
    participant WASM as jtd-wasm<br/>(github.com/livemorecapital/jtd-wasm)
    participant MJS as generated/validators/<br/>widget_vw.validate.mjs
    participant PY as generated/python/<br/>widget_vw_validator.py
    participant JSDOC as jsdoc-from-jtd<br/>(proprietary)
    participant TYPES as generated/jsdoc/<br/>widget_vw.types.mjs

    Note over Author,DB: 1. Define the contract (single source of truth)
    Author->>ODC: write widget_vw.yaml (ODC v3.0 spec)
    ODC->>CLI: datacontract test --checks schema
    CLI->>DB: validate view DDL matches contract fields
    DB-->>CLI: schema OK
    CLI-->>Author: contract proves against live view

    Note over ODC,JTD: 2. ODC → JTD (proprietary transform)
    ODC->>ODC2JTD: read ODC v3.0 model
    ODC2JTD->>JTD: emit widget_vw.jtd.json

    Note over JTD,PY: 3. JTD → MJS + Python via jtd-wasm
    JTD->>WASM: compile JTD schema
    WASM->>MJS: emit widget_vw.validate.mjs (browser validator)
    WASM->>PY: emit widget_vw_validator.py (FastAPI validator)

    Note over JTD,TYPES: 4. JTD → JSDoc (proprietary transform)
    JTD->>JSDOC: read JTD properties
    JSDOC->>TYPES: emit widget_vw.types.mjs (pure JSDoc typedefs)
```

## The Invariant

After `make generate`, these six things describe the same row shape:

```text
installed Postgres view  widget_vw
   == ODC v3.0 YAML      contracts/tripwire/widget_vw.yaml
   == JTD schema          generated/jtd/widget_vw.jtd.json
   == MJS validator       generated/validators/widget_vw.validate.mjs
   == Python validator    generated/python/widget_vw_validator.py
   == JSDoc typedef       generated/jsdoc/widget_vw.types.mjs
```

If any one drifts, `datacontract test` or `tsc --noEmit` catches it.

## Build-Time Toolchain

| Step | Tool | Status |
|---|---|---|
| ODC v3.0 contract authoring | You write YAML | Manual |
| Contract ↔ Postgres proof | [datacontract-cli](https://github.com/datacontract/datacontract-cli) | Off-the-shelf, not vendored |
| ODC → JTD | `odc-to-jtd` | Proprietary — see internal tooling docs |
| JTD → MJS validator | [jtd-wasm](https://github.com/livemorecapital/jtd-wasm) | LiveMore open-source |
| JTD → Python validator | [jtd-wasm](https://github.com/livemorecapital/jtd-wasm) | LiveMore open-source |
| JTD → JSDoc typedef | `jsdoc-from-jtd` | Proprietary — see internal tooling docs |

## Browser-Time Pipeline

```mermaid
sequenceDiagram
    participant J2 as Jinja2 template<br/>widget.html.j2
    participant HTML as served HTML page
    participant IMP as widget.imports.html.js<br/>(generated types + kernel)
    participant RT as widget.runtime.html.js<br/>(transforms + handlers)
    participant VAL as widget_vw.validate.mjs<br/>(jtd-wasm compiled)
    participant TYPES as widget_vw.types.mjs<br/>(JSDoc typedefs)
    participant API as FastAPI<br/>Row[] endpoint
    participant DB as Postgres<br/>widget_vw
    participant DOM as table DOM

    Note over J2,HTML: 5. Page serving
    J2->>HTML: Jinja2 renders HTML with script tags
    HTML->>IMP: browser loads imports (module script)
    HTML->>RT: browser loads runtime (module script)
    IMP->>TYPES: import { WidgetRow } type via JSDoc
    IMP->>VAL: import validateWidgetRow

    Note over IMP,RT: 6. Assembly (page load, once)
    IMP->>IMP: freeze APP_CONFIG
    IMP->>IMP: freeze observability
    IMP->>IMP: freeze fetchAssembly
    IMP->>IMP: bind kernel → widgetFactory

    Note over RT,DOM: 7. Runtime (user clicks Reload)
    RT->>RT: freeze RunContext {traceId, startedAtMs}
    RT->>IMP: widgetFactory(ctx)({businessDate})
    IMP->>API: GET /tripwire/widget?business_date=...
    API->>DB: SELECT * FROM widget_vw WHERE ...
    DB-->>API: result set
    API-->>IMP: JSON array

    Note over IMP,DOM: 8. Streaming validation + transform
    loop each row in JSON array
        IMP->>VAL: validateWidgetRow(row)
        VAL-->>IMP: { ok: true, value } or { ok: false, error }
        IMP->>IMP: yield Object.freeze(validated.value)
    end
    IMP-->>RT: AsyncGenerator<WidgetRow> consumed
    RT->>RT: collect(stream) → frozen WidgetRow[]
    RT->>RT: widgetRowsToGrid(rows) — pure function
    RT->>DOM: render table from GridViewModel
```

## Vanilla JS + JSDoc + tsc --noEmit

There is no TypeScript compiler in the browser path. There is no bundler.
The `.mjs` and `.html.js` files are vanilla JavaScript that runs directly
in modern Chrome and Edge.

JSDoc annotations reference the generated typedefs:

```javascript
// widget.imports.html.js
import { validateWidgetRow } from '../generated/validators/widget_vw.validate.mjs';

/** @typedef {import('../generated/jsdoc/widget_vw.types.mjs').WidgetRow} WidgetRow */

/**
 * @param {AppConfig} config
 * @param {Observability} obs
 * @param {FetchAssembly} fetchAsm
 * @param {RunContext} ctx
 * @param {{ businessDate: string }} input
 * @returns {AsyncGenerator<WidgetRow>}
 */
async function* widgetKernel(config, obs, fetchAsm, ctx, input) {
  const url = `${config.apiBase}/tripwire/widget?business_date=${input.businessDate}`;
  const rows = await fetchAsm.fetchJson(url, ctx);
  for (const row of rows) {
    const result = validateWidgetRow(row);
    if (result.ok) yield Object.freeze(result.value);
  }
}
```

Static proof runs as a separate build step, never at runtime:

```bash
mise exec -- npx -y -p typescript@latest tsc -p tripwire/test/js/tsconfig.json
```

`tsc` reads `.js` and `.mjs` files via `allowJs: true, checkJs: true`, resolves
the JSDoc `@typedef` imports against the generated types, and reports mismatches.
`--noEmit` means no output artifacts — it is a pure proof tool.

This gives you the same type safety as TypeScript without any transpilation,
bundling, or build-to-run dependency. The browser runs exactly the file you
wrote.

## Jinja2 HTML Template

FastAPI serves the page via a Jinja2 template that wires in the vanilla JS:

```html
{# templates/widget.html.j2 #}
{% extends "base.html.j2" %}
{% block scripts %}
<script type="module" src="/static/screens/widget.imports.html.js"></script>
<script type="module" src="/static/screens/widget.runtime.html.js"></script>
{% endblock %}
```

No webpack. No node_modules at runtime. The J2 template is a thin shell that
loads module scripts. The scripts import generated validators and types directly
via browser-native ES module resolution.

## Unit Testing the Kernel

The kernel is a pure function (all dependencies injected). Test it by
supplying fakes:

```javascript
// test/js/widget_kernel.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('widgetKernel', () => {
  it('yields validated frozen rows', async () => {
    const fakeConfig = Object.freeze({ apiBase: '' });
    const fakeObs = Object.freeze({ span: () => ({ end() {} }) });
    const fakeFetch = Object.freeze({
      fetchJson: async () => [
        { widget_id: 1, widget_name: 'Sprocket', price: 9.99 },
      ],
    });
    const ctx = Object.freeze({ traceId: 'test', startedAtMs: 0 });

    const results = [];
    for await (const row of widgetKernel(fakeConfig, fakeObs, fakeFetch, ctx, { businessDate: '2026-01-01' })) {
      results.push(row);
    }

    assert.equal(results.length, 1);
    assert.equal(results[0].widget_name, 'Sprocket');
    assert.throws(() => { results[0].widget_name = 'Mutated'; }); // frozen
  });
});
```

The transform is even simpler — no fakes needed, just rows in, grid out:

```javascript
describe('widgetRowsToGrid', () => {
  it('maps rows to column+row grid', () => {
    const rows = [Object.freeze({ widget_name: 'Sprocket', price: 9.99 })];
    const grid = widgetRowsToGrid(rows);
    assert.deepEqual(grid.columns, ['widget_name', 'price']);
    assert.deepEqual(grid.rows[0], ['Sprocket', 9.99]);
  });
});
```

## Full Pipeline Summary

```text
BUILD TIME                         BROWSER TIME
──────────                         ────────────
widget_vw.yaml (ODC v3.0)         widget.html.j2 serves page
  │                                  │
  ├─→ datacontract-cli proves DB     ├─→ widget.imports.html.js
  │                                  │     imports generated validator
  ├─→ odc-to-jtd (proprietary)      │     imports generated JSDoc types
  │     → widget_vw.jtd.json        │     defines widgetKernel
  │                                  │     assembles widgetFactory
  ├─→ jtd-wasm                       │
  │     → widget_vw.validate.mjs    ├─→ widget.runtime.html.js
  │     → widget_vw_validator.py    │     widgetRowsToGrid (pure)
  │                                  │     onReloadClick handler
  └─→ jsdoc-from-jtd (proprietary)  │
        → widget_vw.types.mjs       └─→ DOM: validated Row[] → table

PROOF (offline, not runtime):
  tsc --noEmit checks JSDoc against generated types
```

## Trust Boundary

```text
unknown JSON
  → jtd-wasm compiled validator (from ODC v3.0 → JTD → MJS)
  → frozen WidgetRow[]
  → pure transform
  → DOM
```

The validator the browser runs was compiled from the same JTD that was
generated from the same ODC contract that was proven against the Postgres
view. One source of truth, mechanically propagated.

---

Canonical design doc: `tripwire/HONEST_KERNEL_FUNCTIONAL_FETCHERS.md`
