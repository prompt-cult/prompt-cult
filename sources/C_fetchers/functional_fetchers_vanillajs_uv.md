# Emit Views, Validators, And Functions

## A small sketch for typed functional fetchers with Python, Postgres, JTD, and vanilla JavaScript

### Abstract

The clean way to serve browser screens from a Python API is not to start from a
frontend framework, a backend framework pattern, or a generic client registry.
It is to start from the data shape that crosses the wire.

For each screen-facing payload, define:

- one database view with the exact row shape the browser needs
- one JSON Type Definition document for that row shape
- one generated runtime validator module from the JTD
- one generated JSDoc typedef from the same JTD
- one Python full-arity view kernel
- one vanilla JavaScript functional fetcher

The request is a typed predicate: usually GET query parameters, sometimes a POST
body. The response is always a non-null list:

```text
Predicate -> Row[]
```

The list may be empty. It should not be `null`.

That single invariant keeps both sides simple.

---

## 1. The real problem

Browser fetch code usually becomes confusing for the same reasons Python
pipelines do:

- the API handler reshapes too much data
- the browser trusts untyped JSON
- one endpoint returns too many unrelated shapes
- rendering code doubles as validation code
- request context, logging, fetch, and cache behavior leak through globals
- a page-level script becomes a bag of event handlers and hidden assumptions

The fix is not a framework.

The fix is to make the boundary visible:

```text
Database view row
  = JTD row schema
  = generated JSDoc row typedef
  = generated runtime validator expectation
```

If those four things agree, the rest of the code can be ordinary functions.

---

## 2. The boundary equation

The screen-serving shape is:

```text
ViewSQL + JTD + QueryPredicate -> Row[]
```

The API layer should be boring:

```text
parse request
  -> create run context
  -> query view
  -> return list of row dictionaries
```

The browser layer should also be boring:

```text
fetch JSON
  -> validate with generated MJS validator
  -> freeze rows
  -> map / flatMap / collect
  -> render
```

The point is not that JTD is magic. The point is that JTD gives a small,
deterministic contract that can generate the runtime validator and the JSDoc
typedefs used by `tsc --allowJs --checkJs`.

---

## 3. The database view owns the row shape

The view should already look like the JSON row.

```sql
create view screen_item_view as
select
  item_id,
  item_name,
  group_code,
  score,
  item_name || ':' || group_code as display_label
from item_seed
join group_seed using (item_id);
```

The view is checked when the database is upgraded. If the view does not install,
the build or migration fails before a browser ever opens.

The JTD lives next to the view. Keeping them in sync is trivial because the view
columns and JTD properties are intentionally the same names:

```json
{
  "elements": {
    "properties": {
      "item_id": { "type": "int32" },
      "item_name": { "type": "string" },
      "group_code": { "type": "string" },
      "score": { "type": "int32" },
      "display_label": { "type": "string" }
    }
  }
}
```

Generated JSDoc should say the same thing:

```javascript
// @ts-check

/**
 * @typedef {Readonly<{
 *   item_id: number,
 *   item_name: string,
 *   group_code: string,
 *   score: number,
 *   display_label: string,
 * }>} ScreenItemRow
 */

export {};
```

And `jtd-wasm` can generate the runtime validator module from the same JTD:

```bash
jtd-codegen screen_item_view.jtd.json --target javascript --out generated/
```

The exact command can be wrapped by `uv run python bin/generate_view_artifacts.py`.
The important invariant is:

```text
view columns == JTD properties == JSDoc fields == MJS validator fields
```

---

## 4. The Python shape

Python should expose a small functional core. FastAPI is only the adapter.

```python
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass
from time import perf_counter


type ViewRow = Mapping[str, object]
type QueryRows = Callable[["ViewPredicate"], Iterator[ViewRow]]


@dataclass(frozen=True)
class ViewConfig:
    view_name: str


@dataclass(frozen=True)
class ViewPredicate:
    min_score: int | None = None


@dataclass(frozen=True)
class RunContext:
    trace_id: str
    started_at_ms: int


@dataclass(frozen=True)
class Observability:
    info: Callable[[str, RunContext, Mapping[str, object]], None]
    error: Callable[[str, RunContext, Mapping[str, object]], None]


@dataclass(frozen=True)
class DbAssembly:
    query_rows: QueryRows
```

The honest kernel has full arity:

```python
def query_view_kernel(
    config: ViewConfig,
    obs: Observability,
    db: DbAssembly,
    ctx: RunContext,
    predicate: ViewPredicate,
) -> Iterator[ViewRow]:
    started = perf_counter()
    try:
        obs.info("query_view_start", ctx, {"view": config.view_name})
        yield from db.query_rows(predicate)
    except Exception as exc:
        obs.error("query_view_failed", ctx, {"view": config.view_name, "error": str(exc)})
        raise
    finally:
        obs.info(
            "query_view_end",
            ctx,
            {
                "view": config.view_name,
                "elapsed_ms": round((perf_counter() - started) * 1000),
            },
        )
```

Binding follows the actual lifecycle:

```text
Config -> Observability -> DbAssembly -> RunContext -> Predicate
```

In code:

```python
from functools import partial


type QueryFactory = Callable[[RunContext, ViewPredicate], Iterator[ViewRow]]
type BoundQuery = Callable[[ViewPredicate], Iterator[ViewRow]]


def assemble_query(
    config: ViewConfig,
    obs: Observability,
    db: DbAssembly,
) -> QueryFactory:
    return partial(query_view_kernel, config, obs, db)


def bind_request(
    ctx: RunContext,
    query: QueryFactory,
) -> BoundQuery:
    return partial(query, ctx)
```

The HTTP handler should mostly disappear into adapter code:

```python
def parse_predicate(params: Mapping[str, str]) -> ViewPredicate:
    raw_min_score = params.get("min_score")
    return ViewPredicate(min_score=int(raw_min_score) if raw_min_score else None)


async def handle_items(request) -> list[ViewRow]:
    ctx = create_run_context(request)
    predicate = parse_predicate(request.query_params)
    rows = list(bind_request(ctx, assembled_query)(predicate))
    return rows
```

The response is a list. It may be empty. It is never `None`.

---

## 5. The vanilla JavaScript shape

The browser has the same mathematical shape.

```text
S : X -> Y*
```

In JavaScript, `Y*` is an `AsyncGenerator<Y>`.

The full-arity fetcher kernel is:

```text
K : (Config, Observability, FetchAssembly, RunContext, Predicate) -> Row*
```

The generated validator proves the wire data before it enters the page logic.

```javascript
// @ts-check

import { ViewScreenItemValidator } from "./generated/screen_item_view.validator.mjs";

/**
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
const freeze = (value) => Object.freeze(value);

/**
 * @typedef {Readonly<{
 *   item_id: number,
 *   item_name: string,
 *   group_code: string,
 *   score: number,
 *   display_label: string,
 * }>} ScreenItemRow
 */

/**
 * @typedef {Readonly<{
 *   min_score?: number,
 * }>} ItemPredicate
 */

/**
 * @typedef {Readonly<{
 *   traceId: string,
 *   startedAtMs: number,
 * }>} RunContext
 */

/**
 * @typedef {Readonly<{
 *   endpoint: string,
 * }>} FetchConfig
 */

/**
 * @typedef {Readonly<{
 *   fetchJson: (url: string) => Promise<unknown>,
 * }>} FetchAssembly
 */

/**
 * @typedef {Readonly<{
 *   info: (message: string, ctx: RunContext, attrs?: Readonly<Record<string, unknown>>) => void,
 *   error: (message: string, ctx: RunContext, attrs?: Readonly<Record<string, unknown>>) => void,
 * }>} Observability
 */
```

The fetcher:

```javascript
/** @param {unknown} value @returns {ReadonlyArray<unknown>} */
function asArray(value) {
  return Array.isArray(value) ? freeze(value.slice()) : freeze([]);
}

/** @param {unknown} value @returns {ScreenItemRow} */
function freezeScreenItemRow(value) {
  const row = /** @type {Record<string, unknown>} */ (value);
  return freeze({
    item_id: Number(row.item_id),
    item_name: String(row.item_name),
    group_code: String(row.group_code),
    score: Number(row.score),
    display_label: String(row.display_label),
  });
}

/** @param {FetchConfig} config @param {ItemPredicate} predicate @returns {string} */
function buildUrl(config, predicate) {
  const url = new URL(config.endpoint, window.location.origin);
  if (predicate.min_score !== undefined) {
    url.searchParams.set("min_score", String(predicate.min_score));
  }
  return url.toString();
}

/**
 * @param {FetchConfig} config
 * @param {Observability} obs
 * @param {FetchAssembly} fetchAssembly
 * @param {RunContext} ctx
 * @param {ItemPredicate} predicate
 * @returns {AsyncGenerator<ScreenItemRow>}
 */
export async function* screenItemsKernel(config, obs, fetchAssembly, ctx, predicate) {
  const started = performance.now();
  try {
    const url = buildUrl(config, predicate);
    obs.info("screen_items_fetch_start", ctx, { url });

    const raw = await fetchAssembly.fetchJson(url);
    const rows = asArray(raw);
    const validation = ViewScreenItemValidator.validateRows(rows);
    if (!validation.ok) {
      obs.error("screen_items_validation_failed", ctx, { errors: validation.errors });
      return;
    }

    for (const row of rows) {
      yield freezeScreenItemRow(row);
    }
  } catch (error) {
    obs.error("screen_items_fetch_failed", ctx, { error: String(error) });
  } finally {
    obs.info("screen_items_fetch_end", ctx, {
      elapsedMs: Math.round(performance.now() - started),
    });
  }
}
```

Assembly binds stable dependencies once:

```javascript
/**
 * @param {FetchConfig} config
 * @param {Observability} obs
 * @param {FetchAssembly} fetchAssembly
 * @returns {(ctx: RunContext) => (predicate: ItemPredicate) => AsyncGenerator<ScreenItemRow>}
 */
export function assembleScreenItems(config, obs, fetchAssembly) {
  return (ctx) => (predicate) =>
    screenItemsKernel(config, obs, fetchAssembly, ctx, predicate);
}
```

Runtime binds a request context:

```javascript
/** @returns {RunContext} */
export function createRunContext() {
  return freeze({
    traceId: crypto.randomUUID(),
    startedAtMs: Date.now(),
  });
}
```

---

## 6. Chaining still works

Every fetcher returns a non-null stream. A stream may yield zero rows.

That makes follow-on lookups ordinary composition:

```text
ItemPredicate -> ScreenItemRow* -> DetailRow* -> ViewModel[]
```

The helpers are small:

```javascript
/**
 * @template A
 * @template B
 * @param {(value: A) => B} fn
 * @param {AsyncIterable<A>} stream
 * @returns {AsyncGenerator<B>}
 */
export async function* mapAsync(fn, stream) {
  for await (const value of stream) {
    yield fn(value);
  }
}

/**
 * @template A
 * @template B
 * @param {(value: A) => AsyncIterable<B>} fn
 * @param {AsyncIterable<A>} stream
 * @returns {AsyncGenerator<B>}
 */
export async function* flatMapAsync(fn, stream) {
  for await (const value of stream) {
    yield* fn(value);
  }
}

/**
 * @template T
 * @param {AsyncIterable<T>} stream
 * @returns {Promise<ReadonlyArray<T>>}
 */
export async function collect(stream) {
  const out = [];
  for await (const value of stream) {
    out.push(value);
  }
  return freeze(out);
}
```

A follow-on lookup is just another fetcher:

```javascript
/**
 * @param {(predicate: ItemPredicate) => AsyncGenerator<ScreenItemRow>} items
 * @param {(row: ScreenItemRow) => AsyncGenerator<DetailRow>} details
 * @param {ItemPredicate} predicate
 */
async function loadDetails(items, details, predicate) {
  return collect(flatMapAsync((row) => details(row), items(predicate)));
}
```

No special orchestration object is required.

---

## 7. Type safety without a browser framework

The safety chain is:

```text
database view
  -> database upgrade proves the SQL object exists
  -> JTD describes the JSON row shape
  -> jtd-wasm emits an MJS validator
  -> the same JTD emits JSDoc typedefs
  -> tsc checks hand-written JS against those typedefs
  -> runtime validator checks wire JSON before freeze
```

The handwritten JavaScript receives only frozen, validated values:

```text
unknown
  -> generated validator
  -> frozen ScreenItemRow
  -> map / flatMap / collect
  -> render
```

The benefit is not theoretical purity. The benefit is that the code says where
trust begins:

```text
before validation: unknown
after validation: ScreenItemRow
```

---

## 8. A small uv proof lane

The project can keep this lightweight:

```bash
uv run python bin/generate_view_artifacts.py
node --check generated/screen_item_view.validator.mjs
node --check src/screen_items_fetcher.js
mise exec -- npx -y -p typescript@latest tsc --allowJs --checkJs --noEmit src/screen_items_fetcher.js
uv run pytest -q tests/test_screen_item_view.py
```

For a browser smoke:

```bash
python -m http.server 9999 --directory target/smoke
rodney start
rodney open http://127.0.0.1:9999/screen_items.html
rodney waitidle
rodney html
rodney stop
```

The smoke should prove only the boundary:

- validator module loads
- fetcher returns a non-null list
- empty list is accepted
- bad wire JSON is rejected
- chained follow-on lookup works
- a tiny Web Component renders the collected rows

---

## 9. What this rejects

This design does not need:

- browser frameworks
- bundlers
- TypeScript syntax
- dependency injection containers
- generic client registries
- page globals as hidden inputs
- API handlers that rebuild product logic from raw tables

It needs:

- a view with a stable row shape
- a JTD file matching that row shape
- generated validator code
- generated JSDoc
- frozen value objects
- full-arity kernels
- tiny assembly functions
- async generator composition

---

## 10. The conclusion

The whole shape is:

```text
View       : Predicate -> Row[]
Validator  : unknown -> Row[]
Fetcher    : (Config, Obs, Fetch, RunContext, Predicate) -> Row*
Assembly   : (Config, Obs, Fetch) -> RunContext -> Predicate -> Row*
Execution  : Predicate -> Row* -> ViewModel[]
```

And the key invariant is:

```text
database view == JTD == generated validator == generated JSDoc
```

Once that invariant is true, browser fetch code can be plain vanilla
JavaScript.

The architecture is not the framework.

The architecture is the visible shape of the computation.
