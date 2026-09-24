---
name: vanilla-pod-js
description: Use when writing framework-free browser JavaScript with JSDoc type checking. Covers JTD schemas, generated runtime validators, frozen immutable data at the trust boundary, typed fetchers that validate before use, and light-DOM Web Components. No frameworks, no transpiling, no TypeScript files, no server-side code.
---

# Vanilla Pod JS

Vanilla Pod JS is a standards-first browser JavaScript convention: recognisably
vanilla, but with the black specks that show something more deliberate is going
on. It keeps browser code small and direct while recovering the protections
that matter. The brief behind this skill carries the provenance; this is the law.

## The convention

1. JTD wire schemas (`.jtd.json`) describe data crossing the wire.
2. `jtd-codegen` generates dependency-free runtime validators from them, ahead
   of time.
3. Plain `.mjs` modules describe the same DTOs with JSDoc.
4. Typed fetchers validate unknown JSON before asserting its JSDoc type; no
   fetcher can return unvalidated data.
5. Validated JSON graphs are recursively frozen at the perimeter
   (`structuralFreeze`).
6. `map` / `flatMap` create small immutable presentation projections when the
   wire shape is not the view shape.
7. `tsc --noEmit` checks JavaScript, JSDoc and DTO fixtures without
   transpiling or emitting anything.
8. Thin, light-DOM Web Components compose native semantic HTML.

This is not an application framework: no domain class hierarchies, decorators,
client-side dependency injection containers or deeply nested mutable models.

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
structuralFreeze (recursive Object.freeze)
          │
          ▼
ReadonlyArray<Row>
          │
          ▼
map / flatMap presentation projection
          │
          ▼
native HTML inside light-DOM Web Components
```

The code states where trust begins: before validation everything is unknown;
after validation it is a typed, frozen DTO. Object schemas have closed-object
semantics: `properties` fields must be present, `optionalProperties` fields may
be absent, and unknown keys are rejected unless the schema sets
`"additionalProperties": true` — model only the keys the contract permits.
Pitfall: in JTD, `{}` is the empty form and accepts any JSON value; it is not
an empty-object schema. The RFC beats test, doc and code when they disagree.

## Schemas and generated validators

- Schemas use the `.jtd.json` suffix. The transposed `.jdt.json` spelling is a
  deprecated alias — do not use it.
- Workflow: author schemas, run the codegen step, import the generated
  `.mjs` validators. Each definition in a schema's `definitions` map becomes a
  generated function; the module exports one `validate(instance)` entry point.
- Canonical surface: `validate(instance) → ValidationError[]`. An empty array
  means valid. Pass a parsed value, never a JSON string. Validation never
  throws; it collects all errors in a single pass — no short-circuit — as
  RFC 8927 §3.3 `(instancePath, schemaPath)` JSON Pointer pairs.
- Generated code shape: zero imports, no helpers, exactly the checks the schema
  requires. Emit-only-what-the-schema-requires: if the schema does not mention
  a form, the generated code contains no logic for it — no dead code.
  Single-path validation: one path per form; schema records are data.
- Generated internals carry `// @ts-nocheck`; handwritten callers, DTOs,
  wrappers and fixtures remain fully checked. Test generated behaviour rather
  than decorating generated implementation details.
- Every generated module exports the generic name `validate`, so the barrel
  (`web/validators.mjs`) re-exports each under a differentiated name:
  `validate` + capitalized stem (e.g. `validateCaseWorkspaces`,
  `validateTrayUpdate`). Import from the barrel; never alias two `validate`s
  into the same scope.

## Typed fetchers

- Canonical transport: `Predicate → NDJSON Row stream` — one JSON object per
  line, no envelope, no page-shaped wrapper. In JavaScript the row stream is an
  `AsyncGenerator<Row>`.
- Full-arity fetcher kernel: `(config, observability, fetchAssembly,
  runContext, predicate) → AsyncGenerator<Row>`. Per row: parse, validate,
  freeze, yield. Fail-closed on the first bad row — throw with the row's
  diagnostics; never silently drop a row, never yield unvalidated data. An
  empty stream yields zero rows, never `null`.
- Assembly/currying lifecycle: bind stable dependencies once — config,
  observability and fetch assembly frozen at page load — bind a frozen
  per-invocation run context, then curry down to the predicate.
- Stream helpers: `mapAsync`, `flatMapAsync`, and `collect` (a full snapshot
  collected into a frozen array). A follow-on lookup is just another fetcher —
  plain composition, no orchestration object.
- The fetcher is a contract client / row-source runner, not an HTTP-specific
  artifact. Source adapters honour the contract: an HTTP/NDJSON source,
  in-memory fakes for tests, an IndexedDB store — alternate data sources are
  adapters over the validated contract, never special-case page DTOs. Layer
  responsibility: generated contract code validates and types rows; source
  adapters acquire rows; kernels transform validated rows. No layer assumes
  the physical substrate unless it is explicitly an adapter.
- This skill teaches the browser-side consumption only. It contains no
  endpoint-implementation guidance: we do not tell any dev how to implement an
  endpoint we fetch.

## Immutability

- `structuralFreeze` applies `Object.freeze` recursively at the validated
  perimeter. `structuredClone` gives freshness, not immutability; the recursive
  freeze supplies the missing half.
- Rows from a fetcher are frozen deeply: both top-level DTOs and nested
  collections.
- Projections create new frozen values and never mutate wire DTOs. Keep the
  wire DTO boring: validate it, freeze it, and leave it alone. If the UI needs
  another shape, derive it with a small pure `map` or `flatMap`; do not teach
  transport objects how to render themselves.
- Freeze before use at binding time: config, observability, fetch assembly and
  run context are frozen when bound, not later.

## The `_type` exhaustive switch

- Tagged wire variants carry a `_type` string tag; the tag set is a bounded
  enum — freeze it and treat it as the closed set of types.
- Dispatch with an exhaustive `switch` over the enum: every known tag has a
  case and `default` throws. No magic values; if-else chains over known types
  are the named anti-pattern — they are not exhaustive and breed bugs when a
  new type is added.
- `@ts-expect-error` negative tests prove exhaustiveness in both directions: an
  unknown `_type` is a type error and a runtime throw, and a handlers object
  missing a case must keep failing `tsc --noEmit`.

## Type checking without transpiling

- TypeScript as a checker only: `allowJs`, `checkJs`, `noEmit`, strict, with
  the DOM/lib/globals settings browser code needs. There are no `.ts` files,
  no emit, no transpilation — the browser runs the exact `.mjs` file you wrote
  (no build-to-run dependency).
- No `.d.ts` files: DTO types are JSDoc — `@typedef` / `@property`,
  `@param` / `@returns`, `@template`, literal and nullable unions, and
  `import("./module.mjs")` type expressions. Declare the subset you actually
  call; rely on inference first and add JSDoc where inference is not enough.
- Module resolution is `node16`, not `"Bundler"` — there is no bundler.
- Sample-data triangulation: a fixture annotated as the DTO pins the schema,
  the JSDoc and the runtime values together, under the four-way field-name
  invariant (schema properties = JSDoc fields = validator expectations =
  fixture fields). If the JSDoc DTO changes but the sample does not, `tsc
  --noEmit` fails; if the JTD schema changes but the sample does not, the
  runtime validator test fails; if wire JSON drifts at runtime, the browser
  validator rejects it before a DTO is returned.

## Testing the boundary

- `node --test` with injected fakes: fake line streams, recording
  observability, frozen fakes. Kernels are pure functions with all
  dependencies injected — supply fakes; pure transforms need no fakes at all.
- Fault-injection proofs (offline, not runtime theatre): wrong-type,
  missing-required and undeclared-extra inputs are each proven rejected with
  `(instancePath, schemaPath)` pairs; the kernel fails closed on the first bad
  row mid-stream and on a malformed JSON line; an empty stream yields zero
  rows. Boundary-only smoke scope: the validator module loads, the fetcher
  returns a non-null possibly-empty row list, bad wire JSON is rejected, and a
  tiny Web Component renders the collected rows.
- Generation-proof tests: the codegen step proves every contract artifact
  exists and is shaped like a generated validator, and live code references
  generated validator paths directly so a codegen break fails honestly.
- Edge-case probe lists: `ref` handling (forward references, mutual recursion,
  deep nesting) and type validation (integer boundaries, fractional detection,
  scientific notation, no type coercion).
- Proof-not-decorate: tests prove behaviour; they do not decorate generated
  implementation details.

## Accessibility posture

Target WCAG 2.2 AA, using native browser semantics before ARIA:

- one `h1` in an ordered heading hierarchy, with banner, main, navigation,
  region and complementary landmarks;
- native links, buttons, search input, lists, description lists and popovers;
  keyboard-operable popovers with Escape dismissal and focus return;
- a first-focus skip link and a visible high-contrast focus indicator;
- minimum 24×24 CSS-pixel targets (44px for primary controls); status text
  that never relies on colour alone;
- polite live regions for filtering and tray updates; focus restoration after
  asynchronous rerenders; `prefers-reduced-motion` and forced-colours support;
- reflow at 320 CSS pixels without horizontal scrolling; desktop composition
  preserved at desktop width.

Automated checks are necessary but insufficient: retain keyboard, zoom/reflow,
forced-colours, screen-reader and user testing at release.

## What this rejects

Browser frameworks. Bundlers. TypeScript syntax. `.d.ts` files. Dependency
injection containers, class hierarchies, decorators, nested mutable models.
Endpoint-implementation guidance in any form. Python or uv tooling in this
pipeline — it is JavaScript, browser-side only. Backend demo servers standing
in for proofs: proofs live in the check gate, not in a disposable server.

## The fixture

`fixture/` is the green reference implementation this skill documents. Read it
before changing any claim above.

- `schemas/case-workspace.jtd.json` — the case-workspace collection (elements
  form, closed-object properties plus enum `optionalProperties`).
  `schemas/tray-update.jtd.json` — the tray-update command (`_type`
  discriminator with two variants).
- `scripts/codegen-validators.mjs` — reads `schemas/*.jtd.json`, emits
  `generated/<stem>.mjs` (prefixed `// @ts-nocheck`) and rebuilds the
  `web/validators.mjs` barrel with differentiated `validate*` names; the
  generated validators in `generated/` are committed.
- `src/` — the perimeter (`structural-freeze.mjs`), kernel (`kernel.mjs`),
  projections (`projections.mjs`) and exhaustive switch (`switch-types.mjs`).
  `test/kernel.test.mjs` is the proof suite, `tsconfig.json` the checker
  options, `Makefile` the toolchain entry points.

`make check` proves, permanently:

1. valid workspace collections and tray commands are accepted (empty error
   array);
2. wrong-type, missing-required and undeclared-extra inputs are rejected with
   `(instancePath, schemaPath)` pairs;
3. barrel exports keep differentiated names wired to their own validators;
4. the kernel yields frozen validated rows from an injected NDJSON line
   stream, fails closed on the first bad or malformed row, and yields zero
   rows — not `null` — for an empty stream;
5. rows and nested collections are deeply frozen, and projections create new
   frozen values without mutating wire DTOs;
6. the `_type` exhaustive switch handles every known tag, throws on unknown
   tags, and a missing handlers case stays a `tsc --noEmit` compile error via
   `@ts-expect-error`.

`make check` also runs `node --check` over every `.mjs` and `tsc --noEmit`
over the whole tree; it produces no transpiled output.
Disclosure: `make init` fetches the pinned `jtd-codegen` binary (pinned
release tag, overridable) into the gitignored `.bin/` and installs the pinned
checker; both steps degrade gracefully when the network is unavailable. The
generated validators are committed: with the binary present, `make codegen`
regenerates them; without it, the codegen script verifies the committed
validators' shape and rebuilds the barrel only, so `make check` still passes
offline. A missing or malformed committed validator is a hard error.
