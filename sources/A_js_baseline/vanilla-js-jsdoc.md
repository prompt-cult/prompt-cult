# Modern Browser JS with JSDoc and Type Safety

## Browser Baseline

> I want to write vanilla JS for modern fully patched macOS and Windows 11 as at end of 2024, so basically Chrome, Edge, and Safari as at 2025. What versions of JS are available?

If you target:

- fully patched Windows 11 in late 2024 / early 2025
- fully patched macOS in the same period
- current Chrome, Edge, and Safari users only
- no Firefox
- no legacy browsers
- no enterprise laggards

...then you can safely write what is effectively **modern ES2023 + most ES2024 JavaScript** without transpiling.

In practice, your baseline is roughly:

| Browser | Realistic 2025 version baseline | JS engine |
| --- | --- | --- |
| Chrome | 130-132 | V8 |
| Edge | 130-132 | V8 |
| Safari | 18 | JavaScriptCore |

Safari is the limiting factor, not Chrome or Edge.

## What You Can Safely Use

You can treat these as basically universal for your target.

### Core Modern Syntax

```js
const
let
=>          // arrow functions
class
extends
super

const { x } = obj;
const [a, b] = arr;
const msg = `hello ${name}`;
const copy = { ...obj };
const arr2 = [...arr];
```

### Async Modern JS

```js
async function load() {
  const r = await fetch("/api");
  return await r.json();
}
```

Also safe:

- `Promise.allSettled`
- `Promise.any`
- async iterators
- top-level `await` in modules

### Modern Operators

All safe:

```js
obj?.user?.name
value ?? defaultValue
x ||= y
x &&= y
x ??= y
```

### Modules

Native ES modules are fully safe:

```js
import { thing } from "./thing.js";
export function test() {}
```

Including dynamic imports:

```js
const mod = await import("./feature.js");
```

### Newer Class Features

Safe in 2025 browsers:

```js
class Test {
  #privateField = 1;

  static {
    console.log("init");
  }
}
```

### Array Methods

All safe:

```js
arr.at(-1)
arr.findLast(fn)
arr.findLastIndex(fn)
arr.toSorted()
arr.toReversed()
arr.toSpliced()
```

### Useful Newer APIs

Safe:

```js
structuredClone(obj)
AbortController
URL
URLSearchParams
crypto.randomUUID()
fetch()
```

## ES2024 Status

You can use most ES2024 features already.

Especially safe:

```js
Object.groupBy
const grouped = Object.groupBy(items, x => x.type);
```

Widely available in 2025 browsers.

```js
Map.groupBy
const grouped = Map.groupBy(items, x => x.type);
```

Generally safe in latest browsers too.

## What Is Not Universally Safe Yet

These are the main things to avoid if you want "just works everywhere" without checks or polyfills.

### Temporal API

Still not universally shipped:

```js
Temporal.Now.instant()
```

Avoid for now unless bundling a polyfill.

Use:

- `Date`
- or Luxon / date-fns / dayjs

### Very New Stage-3 Proposals

Avoid relying on:

- pipeline operator
- records / tuples
- decorators
- operator overloading
- type annotations proposal

## Practical Recommendation

For your target audience, you can comfortably write:

- ES modules
- async/await
- private fields
- optional chaining
- nullish coalescing
- modern array methods
- fetch-based apps
- native browser APIs

...with:

- no Babel
- no TypeScript required
- no transpilation
- minimal polyfills

That's a very different world from supporting 2020-era browsers.

## A Realistic Safe Modern Baseline

This is a good mental model:

> If it's on MDN and landed before about 2023, it's probably safe.

Safari 18 is the main constraint. Chrome and Edge are far ahead.

## What I Would Avoid Even For This Target

Even though some are supported:

- decorators
- Temporal
- import assertions edge cases
- bleeding-edge iterator helpers
- anything still marked experimental on MDN

Everything else is basically green.

## Suggested Coding Style for 2025 Vanilla JS

You can now write code like this completely safely:

```js
export async function loadUsers() {
  const response = await fetch("/api/users");

  if (!response.ok) {
    throw new Error("Request failed");
  }

  const users = await response.json();

  return users
    .filter(u => u.active)
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name }) => ({
      id,
      name,
      slug: name.toLowerCase(),
    }));
}
```

That is now normal browser JavaScript.

## Bottom Line

For modern patched macOS + Windows 11 browsers in 2025:

- think ES2023 as fully safe
- think most ES2024 safe
- Safari is your compatibility floor
- you can realistically build modern apps with:
  - native modules
  - no transpiler
  - no framework
  - almost no polyfills

The web platform is finally in a very good place for vanilla JS.

---

## JSDoc + `tsc --noEmit` for Vanilla JS

> How can I add JSDoc to all my vanilla JS so the TypeScript compiler does `noEmit` checking for errors?

Use TypeScript as a checker only.

### 1. Install TypeScript

```bash
npm install --save-dev typescript
```

### 2. Add `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.js"]
}
```

Key bits:

- `allowJs` includes `.js`
- `checkJs` type-checks them
- `noEmit` prevents output files

This is the official TypeScript-supported path for JS projects using JSDoc.

### 3. Add an npm script

```json
{
  "scripts": {
    "check": "tsc --noEmit"
  }
}
```

Run:

```bash
npm run check
```

### 4. Add JSDoc to your JS

#### Functions

```js
/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
export function describeUser(name, age) {
  return `${name} is ${age}`;
}
```

#### Objects

```js
/**
 * @typedef {object} User
 * @property {number} id
 * @property {string} name
 * @property {string=} email
 */

/** @type {User} */
const user = {
  id: 1,
  name: "Simon",
};
```

#### Arrays

```js
/** @type {User[]} */
const users = [];
```

#### Unions

```js
/** @type {"idle" | "loading" | "error" | "success"} */
let status = "idle";
```

#### Nullable values

```js
/** @type {HTMLElement | null} */
const el = document.querySelector("#app");
```

#### Function callbacks

```js
/**
 * @callback Formatter
 * @param {string} value
 * @returns {string}
 */

/** @type {Formatter} */
const upper = value => value.toUpperCase();
```

#### Imports from another file

```js
/** @typedef {import("./types.js").User} User */
```

Or from a `.d.ts` file:

```js
/** @type {import("./types").Config} */
const config = {
  debug: true,
};
```

TypeScript supports JSDoc tags such as `@type`, `@param`, `@returns`, `@typedef`, `@callback`, `@template`, `@this`, `@extends`, and `@enum` in JavaScript files.

### 5. Optional: enable per-file checking

With `checkJs: true`, all included JS is checked.

For individual files only, remove `checkJs` and add this at the top of a file:

```js
// @ts-check
```

To opt out in one file:

```js
// @ts-nocheck
```

### 6. Browser globals

For vanilla browser JS, keep this:

```json
"lib": ["ES2023", "DOM", "DOM.Iterable"]
```

That gives TypeScript types for:

- `document`
- `window`
- `HTMLElement`
- `fetch`
- `AbortController`
- `URL`
- `Event`
- `MouseEvent`

### 7. A strong starter setup

For your modern-browser target, use:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.js"]
}
```

Then gradually add JSDoc where inference is not enough.


---

## Historical footnote

Content present in earlier revisions of this document but absent from the
newest version, preserved verbatim from the capture (pairwise reduction
newest → oldest). Each chunk is labelled with the revision it last appeared
in. Nothing here is current guidance — it is lost-idea recovery for the later
extraction passes.

Pairwise reduction over all 2 earlier revisions found no content absent from the newest version.
