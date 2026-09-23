## Vanilla Pod JS

**Vanilla Pod JS** is this project's standards-first JavaScript convention: recognisably vanilla, but with the black specks that show something more deliberate is going on.

It keeps browser code small and direct while recovering the protections that matter:

1. JSON Type Definition (JTD) describes data crossing the wire.
2. `jtd-codegen` generates dependency-free runtime validators.
3. `.mjs` modules describe the same simple DTOs with JSDoc.
4. Fetchers validate unknown JSON before asserting its JSDoc type.
5. Validated JSON graphs are recursively frozen at the perimeter.
6. `map` and `flatMap` create small immutable presentation projections when the wire shape is not the view shape.
7. `tsc --noEmit` checks JavaScript, JSDoc and DTO fixtures without transpiling or emitting anything.
8. Thin, light-DOM Web Components compose native semantic HTML.

This is not an attempt to recreate an application framework. There are no domain class hierarchies, decorators, client-side dependency injection containers or deeply nested mutable models. Valuable or sophisticated browser logic can later be compiled from Rust or AssemblyScript to WebAssembly. TypeScript files can also be introduced selectively if a piece of logic genuinely earns them.

## The validated perimeter

```text
unknown JSON from the wire
          │
          ▼
generated JTD validator ── failure ──► reject; render no DTO
          │ success
          ▼
JSDoc type assertion
          │
          ▼
recursive Object.freeze()
          │
          ▼
ReadonlyArray<CaseWorkspace>
          │
          ▼
map / flatMap presentation projection
          │
          ▼
native HTML inside light-DOM Web Components
```

`Response.json()` already creates a fresh JavaScript object graph. `structuredClone()` can create another deep clone when isolation is needed, but it does **not** make data immutable. Vanilla Pod JS uses `structuralFreeze()` to apply `Object.freeze()` recursively after validation. The DTO and each nested object or collection are therefore read-only both to the checker and at runtime.

The fetch contract is explicit:

```js
/**
 * @param {string} caseId
 * @returns {Promise<ReadonlyArray<CaseWorkspace>>}
 */
export async function fetchWorkspaces(caseId) {
  // fetch unknown JSON → generated validation → structuralFreeze → typed return
}
```

`sample-data.mjs` is deliberately annotated as a `CaseWorkspace`. It triangulates the two descriptions of the contract:

- If the JSDoc DTO changes but the sample does not, `tsc --noEmit` fails.
- If the JTD schema changes but the sample does not, the runtime validator test fails.
- If server JSON drifts at runtime, the browser validator rejects it before a DTO is returned.

## Generated validators

The schemas are:

- `schemas/case-workspace.jtd.json` — a collection of case workspaces.
- `schemas/tray-update.jtd.json` — the tray update command.

Release `0.3.0` of [`simbo1905/jtd-wasm`](https://github.com/simbo1905/jtd-wasm/releases/tag/release%2F0.3.0) generates standalone ESM. Each generated module exports the generic name `validate`, so `web/validators.mjs` re-exports domain-specific names:

```js
export { validate as validateCaseWorkspaces } from "./generated/case-workspace.validator.mjs";
export { validate as validateTrayUpdate } from "./generated/tray-update.validator.mjs";
```

Generated internals carry `@ts-nocheck`; handwritten callers, DTOs, wrappers and fixtures remain fully checked. We test generated behaviour rather than decorating generated implementation details.

## Build and run

```sh
cd spike29
make init
make check
make start
```

`make init` downloads the platform-specific `jtd-codegen` 0.3.0 binary into the repository's ignored top-level `.bin`, installs the pinned checker, and generates validators. `make check` performs generation, `tsc --noEmit`, and the Bun tests. It produces no transpiled application code.

The temporary Bun server listens on <http://localhost:52029/>. Bun and its in-memory sample data are disposable scaffolding; the real backend is expected to be Go. The portable parts of the spike are the schemas, generated-validation boundary, JSDoc DTO convention, immutability rule, projections, Web Components and tests.

Temporary API routes:

- `GET /api/workspaces?case=CNA-2041`
- `POST /api/tray?case=CNA-2041`

## Proof, including failures

`make check` permanently verifies:

- valid workspace collections and tray commands are accepted;
- changed primitive types are rejected;
- missing required properties are rejected;
- undeclared properties are rejected;
- invalid nested enum values are rejected;
- fetchers never return invalid wire data;
- returned DTOs and nested collections are frozen;
- presentation projections are new, frozen values and do not mutate wire DTOs;
- deliberately invalid JSDoc assignments remain compiler errors via `@ts-expect-error` contracts.

For browser-level runtime demonstrations, the disposable server can inject malformed responses:

- `/?fault=wrong-type`
- `/?fault=missing`
- `/?fault=extra`

Each must render `Case unavailable`; none may construct or render a `CaseWorkspace`.

## Accessibility posture

The target is WCAG 2.2 AA, using native browser semantics before ARIA:

- one `h1` and an ordered heading hierarchy;
- banner, main, navigation, region and complementary landmarks;
- native links, buttons, search input, lists, description lists and popovers;
- a first-focus skip link that moves focus to the case heading;
- keyboard-operable popovers with Escape dismissal and focus return;
- visible high-contrast focus treatment;
- minimum 24×24 CSS-pixel interactive targets, with primary controls at 44px;
- status text that never relies on colour alone;
- polite live announcements for filtering and tray updates;
- focus restoration after asynchronous rerenders;
- `prefers-reduced-motion` and forced-colours support;
- reflow at 320 CSS pixels without horizontal scrolling;
- the original side-by-side case/assistant composition at desktop width.

Automated checks are necessary but insufficient. Release work should retain keyboard, zoom/reflow, forced-colours, common screen-reader and user testing alongside the build checks.

## Design rule

Keep the wire DTO boring. Validate it, freeze it, and leave it alone. If the UI needs another shape, derive that shape with a small pure `map` or `flatMap`; do not teach transport objects how to render themselves.
