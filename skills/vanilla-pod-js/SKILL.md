---
name: vanilla-pod-js
description: Use when writing framework-free browser JavaScript with JSDoc type checking. Covers JTD schemas, generated runtime validators, frozen immutable data at the trust boundary, typed fetchers that validate before use, and light-DOM Web Components. No frameworks, no transpiling, no TypeScript files, no server-side code.
---

# Vanilla Pod JS

Vanilla Pod JS is a convention for browser JavaScript that stays vanilla but
recovers the protections that matter: generated runtime validators, frozen
immutable data at the trust boundary, and type checking without a compiler
step in the build path. This document is a run-through: do the steps in
order on an empty repository and you end with a proven screen boundary.
The examples are condensed from the fixture at `fixture/` — the green
reference implementation, where the full versions of every pattern live.

## From an empty repo

You need four tools. Nothing else; the generated validators and the browser
code have zero runtime dependencies.

| Tool | What it does | Where it comes from | Pin |
|---|---|---|---|
| jtd-codegen | compiles a JTD schema into a validator module | GitHub Releases of prompt-cult/json-type-definition-RFC-8927, or build from source with cargo | nightly-20260829 (what the fixture proves); bump the pin only after the check gate passes |
| Node.js | runs the validators, the kernel, and the tests | nodejs.org or brew | 18 or newer (the tests use the built-in test runner); 20 or newer recommended |
| TypeScript | checks JSDoc types; never emits | npm | latest; always run with no emit |
| gh CLI | downloads the generator release binary (optional; curl works too) | cli.github.com | any recent version |

The generator is jtd-codegen, an ahead-of-time compiler for RFC 8927 JSON
Type Definition schemas. You feed it a schema file; it prints a validator
module. The modules it emits import nothing, so the browser runs plain
JavaScript files with no bundler in the path.

Install the generator (macOS arm64 in this example; the asset table follows):

```sh
mkdir -p .bin
gh release download nightly-20260829 \
  --repo prompt-cult/json-type-definition-RFC-8927 \
  --pattern "*aarch64-apple-darwin*" \
  --dir .bin --clobber
tar -xzf .bin/jtd-codegen*.tar.gz -C .bin
chmod +x .bin/jtd-codegen
```

Without the gh CLI, curl the same asset:

```sh
curl -sL -o .bin/jtd-codegen.tar.gz \
  https://github.com/prompt-cult/json-type-definition-RFC-8927/releases/download/nightly-20260829/jtd-codegen_nightly-20260829_aarch64-apple-darwin.tar.gz
```

Or build from source:

```sh
git clone https://github.com/prompt-cult/json-type-definition-RFC-8927
cd json-type-definition-RFC-8927 && cargo build --release -p jtd-codegen
# binary lands at target/release/jtd-codegen
```

Release assets are named `jtd-codegen_<tag>_<platform>.tar.gz` with these
platforms: aarch64-apple-darwin, aarch64-unknown-linux-gnu,
x86_64-unknown-linux-gnu, x86_64-pc-windows-msvc (zip).

Then the five steps: write a schema, generate the validator, write the
barrel and the fetcher, wire the check gate, run it. The rest of this
document walks each step.

## Step 1: write a schema

A schema describes the exact row shape crossing the wire. Save this as
`schemas/case-workspace.jtd.json`:

```json
{
  "elements": {
    "properties": {
      "case_id": { "type": "string" },
      "case_name": { "type": "string" }
    },
    "optionalProperties": {
      "owner": { "type": "string" },
      "priority": { "enum": ["low", "normal", "high"] }
    }
  }
}
```

Three rules while you author:

- Properties listed under properties must be present; properties under
  optionalProperties may be absent; anything else is rejected unless the
  schema says `"additionalProperties": true`. Model only the keys the
  contract permits.
- In JTD the empty form `{}` accepts any JSON value. It is not an empty
  object schema. Do not reach for it by accident.
- The RFC beats test, doc, and code when they disagree. When something
  looks wrong, check RFC 8927 first.

Use the `.jtd.json` suffix for schema files. The transposed `.jdt.json`
spelling is a deprecated alias; do not use it.

## Step 2: generate the validator

One schema in, one module out on stdout:

```sh
mkdir -p generated
.bin/jtd-codegen --target js schemas/case-workspace.jtd.json > generated/case-workspace.mjs
```

The generated module imports nothing and exports one function. Use it like
this:

```js
import { validate } from "./generated/case-workspace.mjs";

validate({ case_id: "CNA-2041", case_name: "Shunt" });
// valid input returns [] — an empty array means valid

validate({ case_id: 42 });
// returns [{ instancePath: "/case_id", schemaPath: "/properties/case_id/type" },
//          { instancePath: "",        schemaPath: "/properties/case_name" }]
```

The contract, in plain terms:

- Pass a parsed value, never a JSON string.
- Validation never throws; it collects every error in one pass. An empty
  array means valid.
- Errors are pairs of JSON Pointers: instancePath says where the data is
  wrong, schemaPath says which part of the schema rejected it (RFC 8927
  section 3.3).
- The generator emits only the checks the schema requires, one validation
  path per form. If the schema does not mention a form, the generated code
  has no logic for it and no dead code besides.
- Generated internals carry a `// @ts-nocheck` banner. Handwritten code
  stays fully checked. Test what the validator does, not how it is written.

## Step 3: the barrel

Every generated module exports the same generic name validate, so a barrel
module re-exports each under its own name. Save as `web/validators.mjs`:

```js
export { validate as validateCaseWorkspaces } from "../generated/case-workspace.mjs";
export { validate as validateTrayUpdate } from "../generated/tray-update.mjs";
```

Name rule: validate plus the capitalized schema stem. Import from the
barrel and never alias two validate functions into one scope by hand.

## Step 4: a typed fetcher

The fetcher consumes an NDJSON stream: one JSON object per line, no
envelope, no page wrapper. The wire contract is a predicate in, a row
stream out; the stream may be empty and is never null. In JavaScript the
row stream is an async generator.

The kernel does one thing per row: parse, validate, freeze, yield. And it
fails closed: the first bad line throws with that row's diagnostics. It
never drops a row and never yields unvalidated data.

```js
// src/kernel.mjs
import { structuralFreeze } from "./structural-freeze.mjs";

export async function* fetcherKernel(config, obs, fetchAssembly, ctx, predicate) {
  const lines = await fetchAssembly(config, ctx, predicate);
  let line = 0;
  for await (const raw of lines) {
    line += 1;
    if (typeof raw !== "string" || raw.trim() === "") continue;
    let instance;
    try {
      instance = JSON.parse(raw);
    } catch {
      throw new Error(`[${config.name}] row ${line}: malformed JSON line`);
    }
    const errors = config.validate(instance);
    if (errors.length > 0) {
      throw new Error(`[${config.name}] row ${line}: ${JSON.stringify(errors)}`);
    }
    obs.info(`accepted row ${line}`, { schema: config.name });
    yield structuralFreeze(instance);
  }
}
```

The kernel takes everything it needs as arguments: config (including the
validator), observability, the fetch assembly, a run context, and the
predicate. Bind the stable parts once at page load, bind a fresh run
context per invocation, and the last argument is all that changes from
call to call.

The fetch assembly is any function that returns an async iterable of
lines. That indirection is the point: an HTTP NDJSON source is one
adapter, an in-memory fake is another for tests, an IndexedDB store is a
third. Alternate data sources are adapters over the validated contract,
never special-case page objects.

The endpoint is not your problem here. This skill teaches browser-side
consumption only; we do not tell any dev how to implement an endpoint we
fetch.

Compose streams with small helpers:

```js
async function* mapAsync(fn, stream) {
  for await (const value of stream) yield fn(value);
}
async function* flatMapAsync(fn, stream) {
  for await (const value of stream) yield* fn(value);
}
async function collect(stream) {
  const out = [];
  for await (const value of stream) out.push(value);
  return out;
}
```

A follow-on lookup is just another fetcher; plain composition, no
orchestration object.

## Step 5: freeze and project

Freeze at the perimeter, recursively, right after validation:

```js
// src/structural-freeze.mjs
export function structuralFreeze(value) {
  if (value === null || typeof value !== "object") return value;
  for (const item of Object.values(value)) structuralFreeze(item);
  Object.freeze(value);
  return value;
}
```

After this, the row and everything nested inside it is read-only, both to
the type checker and at runtime. structuredClone gives you a fresh copy,
not immutability; the recursive freeze is the half it is missing.

When the view needs a different shape, derive it with a pure projection
that builds a new frozen array and never touches the wire rows:

```js
// src/projections.mjs
export function projectMap(rows, project) {
  return structuralFreeze(rows.map((row, index) => project(row, index)));
}
```

Keep the wire DTO boring. Validate it, freeze it, leave it alone. If the
UI needs another shape, derive the shape with a small pure map or flatMap;
do not teach transport objects how to render themselves.

## Step 6: the `_type` exhaustive switch

When the wire carries variants, tag them with a `_type` string and make
the tag set a bounded enum. The schema does the same with the
discriminator form:

```json
{
  "discriminator": "_type",
  "mapping": {
    "tray_moved": {
      "properties": {
        "case_id": { "type": "string" },
        "from_tray": { "type": "string" },
        "to_tray": { "type": "string" }
      }
    },
    "tray_note_added": {
      "properties": {
        "case_id": { "type": "string" },
        "note": { "type": "string" }
      }
    }
  }
}
```

Dispatch with an exhaustive switch: every known tag gets a case, the
default case throws, and the tag set is frozen as the closed set of types.

```js
export const TRAY_UPDATE_TYPES = Object.freeze(["tray_moved", "tray_note_added"]);

export function switchTrayUpdate(update, handlers) {
  switch (update._type) {
    case "tray_moved":      return handlers.trayMoved(update);
    case "tray_note_added": return handlers.trayNoteAdded(update);
    default: throw new Error(`Unknown _type: ${JSON.stringify(update)}`);
  }
}
```

No magic strings in handlers, no if-else chains over known types. A
handlers object that misses a case must fail the type check; the negative
test that proves it is in step 8.

## Step 7: the checker

TypeScript runs as a checker only. It reads the JavaScript, checks the
JSDoc, and writes nothing. Commit this `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.mjs", "generated/**/*.mjs", "web/**/*.mjs", "test/**/*.mjs"]
}
```

There are no .ts files, no .d.ts files, no emit, no transpilation: the
browser runs the exact .mjs file you wrote. Resolution is node16, not
Bundler, because there is no bundler.

The JSDoc patterns you actually need: `@typedef` with `@property` for DTOs,
`@param` and `@returns` on functions, `@template` for generics, literal
unions for closed sets, and `import("./module.mjs")` type expressions to
pull a typedef from another file. Rely on inference first; add JSDoc where
inference is not enough.

Pin the contract with sample data. Annotate a fixture value as the DTO:

```js
/** @type {import("./src/kernel.mjs").KernelConfig} */
const config = { name: "case-workspace", validate: validateCaseWorkspaces };
```

Now the schema, the JSDoc, the validator, and the sample must agree: change
the JSDoc and the sample stops compiling; change the schema and the runtime
validator test fails; change the wire and the browser validator rejects it
before a DTO is returned. One field-name invariant, four artifacts.

## Step 8: test it

The built-in runner, with fakes injected — the kernel is a pure function,
so tests supply an in-memory line stream:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetcherKernel } from "../src/kernel.mjs";

const config = { name: "case-workspace", validate: validateCaseWorkspaces };
const obs = { info() {}, warn() {} };
const lines = async function* () {
  yield `${JSON.stringify({ case_id: "CNA-2041", case_name: "Shunt" })}\n`;
};

test("yields frozen validated rows", async () => {
  const rows = [];
  for await (const row of fetcherKernel(config, obs, lines, {}, {})) rows.push(row);
  assert.equal(rows.length, 1);
  assert.ok(Object.isFrozen(rows[0]));
});

test("fails closed on a bad row mid-stream", async () => {
  const bad = async function* () {
    yield `${JSON.stringify({ case_id: "CNA-1", case_name: "ok" })}\n`;
    yield `{"case_id": 42}`;
  };
  await assert.rejects(
    () => collect(fetcherKernel(config, obs, bad, {}, {})),
    /row 2/
  );
});

test("empty stream yields zero rows, not null", async () => {
  const empty = async function* () {};
  const rows = await collect(fetcherKernel(config, obs, empty, {}, {}));
  assert.deepEqual(rows, []);
});
```

Beyond these three, prove the rejection cases with the same fakes: a wrong
primitive type, a missing required property, and an undeclared extra
property each come back rejected with their instancePath and schemaPath
pairs. Prove exhaustiveness negatively: a handlers object missing a case
keeps failing `tsc --noEmit` (mark the line with `@ts-expect-error` and the
check fails if the error ever stops appearing).

Tests prove behaviour; they do not decorate generated implementation
details.

## Rules worth memorising

- Fail closed. The first bad row throws; nothing invalid is dropped,
  yielded, or coerced.
- The stream is a stream. Zero rows is a valid answer; null never is.
- Closed objects. Unknown keys are rejected unless the schema permits them.
- `{}` in JTD accepts any JSON value. It is the empty form, not an empty
  object.
- The RFC beats test, doc, and code when they disagree.
- The generator emits only the checks the schema requires; one validation
  path per form; schemas are data.
- Generated code validates and types rows; adapters acquire rows; kernels
  transform validated rows. No layer assumes the physical substrate unless
  it is explicitly an adapter.
- Freeze at binding time: config, observability, fetch assembly, and run
  context are frozen when bound, not later.
- Tests prove behaviour, not generated implementation details.
- Endpoint-implementation guidance lives elsewhere. This skill teaches
  browser-side consumption only.

## Accessibility posture

Target WCAG 2.2 AA, using native browser semantics before ARIA:

- one h1 in an ordered heading hierarchy, with banner, main, navigation,
  region, and complementary landmarks;
- native links, buttons, search input, lists, description lists, and
  popovers, with keyboard-operable popovers using Escape dismissal and
  focus return;
- a first-focus skip link and a visible high-contrast focus indicator;
- minimum 24 by 24 CSS-pixel targets, 44 for primary controls; status text
  that never relies on colour alone;
- polite live regions for filtering and tray updates; focus restoration
  after asynchronous rerenders; reduced-motion and forced-colours support;
- reflow at 320 CSS pixels without horizontal scrolling.

Automated checks are necessary but not sufficient: keep keyboard,
zoom and reflow, forced-colours, screen-reader, and user testing at
release.

## What this rejects

Browser frameworks. Bundlers. TypeScript syntax and .d.ts files.
Dependency injection containers, class hierarchies, decorators, nested
mutable models. Endpoint-implementation guidance in any form. Python or
uv tooling in this pipeline; it is JavaScript, browser-side only. Backend
demo servers standing in for proofs: proofs live in the check gate.

## The fixture

`fixture/` is the green reference implementation this document describes.
Read it before changing any claim above.

`make check` in the fixture proves, permanently:

1. valid workspace collections and tray commands are accepted with an
   empty error array;
2. wrong-type, missing-required, and undeclared-extra inputs are rejected
   with their error pairs;
3. the barrel keeps differentiated names wired to their own validators;
4. the kernel yields frozen validated rows, fails closed on the first bad
   or malformed row, and yields zero rows for an empty stream;
5. rows and nested collections are deeply frozen; projections create new
   frozen values without mutating wire rows;
6. the `_type` switch handles every known tag, throws on unknown tags, and
   a missing handlers case stays a compile error.

The check gate runs the codegen step, `node --check` on every module, the
test suite, and `tsc --noEmit` over the whole tree, and produces no
transpiled output. `make init` fetches the pinned generator binary into
the gitignored `.bin/` directory and installs the checker; both steps
degrade gracefully without a network, because the generated validators are
committed: with the binary present the codegen step regenerates them,
without it the script verifies the committed validators and rebuilds the
barrel only. A missing or malformed committed validator is a hard error.
