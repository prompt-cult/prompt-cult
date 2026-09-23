---
name: vanilla-js-jsdoc
description: Use when writing modern vanilla JavaScript for current browsers (Chrome, Edge, Safari 2025 baseline) with JSDoc type annotations and tsc --noEmit for type checking — no transpiler, no framework, no TypeScript syntax required.
---

# Modern Browser JS with JSDoc and Type Safety

## Browser Baseline

Target fully patched macOS and Windows 11 as at end of 2024 / early 2025: current
Chrome, Edge, and Safari users only. No Firefox, no legacy browsers, no enterprise
laggards. You can safely write what is effectively **modern ES2023 + most ES2024
JavaScript** without transpiling.

| Browser | Realistic 2025 version baseline | JS engine |
| --- | --- | --- |
| Chrome | 130-132 | V8 |
| Edge | 130-132 | V8 |
| Safari | 18 | JavaScriptCore |

Safari is the limiting factor, not Chrome or Edge.

## What You Can Safely Use

### Core Modern Syntax

```javascript
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

```javascript
async function load() {
  const r = await fetch("/api");
  return await r.json();
}
```

Also safe: `Promise.allSettled`, `Promise.any`, async iterators, top-level `await`
in modules.

### Modern Operators

```javascript
obj?.user?.name
value ?? defaultValue
x ||= y
x &&= y
x ??= y
```

### Modules

Native ES modules are fully safe:

```javascript
import { thing } from "./thing.js";
export function test() {}
```

Including dynamic imports:

```javascript
const mod = await import("./feature.js");
```

### Newer Class Features

```javascript
class Test {
  #privateField = 1;

  static {
    console.log("init");
  }
}
```

### Array Methods

```javascript
arr.at(-1)
arr.findLast(fn)
arr.findLastIndex(fn)
arr.toSorted()
arr.toReversed()
arr.toSpliced()
```

### Useful Newer APIs

```javascript
structuredClone(obj)
AbortController
URL
URLSearchParams
crypto.randomUUID()
fetch()
```

### ES2024

```javascript
Object.groupBy
const grouped = Object.groupBy(items, x => x.type);

Map.groupBy
const grouped = Map.groupBy(items, x => x.type);
```

## What Is Not Universally Safe Yet

- **Temporal API** — not universally shipped. Use `Date`, or Luxon / date-fns / dayjs.
- **Very new stage-3 proposals** — pipeline operator, records/tuples, decorators,
  operator overloading, type annotations proposal.
- **Bleeding-edge iterator helpers** — anything still marked experimental on MDN.

## Practical Rule of Thumb

> If it's on MDN and landed before about 2023, it's probably safe.

Safari 18 is the main constraint. Chrome and Edge are far ahead.

## JSDoc + `tsc --noEmit` for Vanilla JS

Use TypeScript as a checker only — no `.ts` files, no emit, no transpilation.

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

Key bits: `allowJs` includes `.js`, `checkJs` type-checks them, `noEmit` prevents
output files.

### 3. Add an npm script

```json
{
  "scripts": {
    "check": "tsc --noEmit"
  }
}
```

Run: `npm run check`

### 4. Add JSDoc to your JS

#### Functions

```javascript
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

```javascript
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

```javascript
/** @type {User[]} */
const users = [];
```

#### Unions

```javascript
/** @type {"idle" | "loading" | "error" | "success"} */
let status = "idle";
```

#### Nullable values

```javascript
/** @type {HTMLElement | null} */
const el = document.querySelector("#app");
```

#### Function callbacks

```javascript
/**
 * @callback Formatter
 * @param {string} value
 * @returns {string}
 */

/** @type {Formatter} */
const upper = value => value.toUpperCase();
```

#### Imports from another file

```javascript
/** @typedef {import("./types.js").User} User */
```

Or from a `.d.ts` file:

```javascript
/** @type {import("./types").Config} */
const config = {
  debug: true,
};
```

TypeScript supports JSDoc tags such as `@type`, `@param`, `@returns`, `@typedef`,
`@callback`, `@template`, `@this`, `@extends`, and `@enum` in JavaScript files.

### 5. Optional: per-file checking

With `checkJs: true`, all included JS is checked. For individual files only, remove
`checkJs` and add this at the top of a file:

```javascript
// @ts-check
```

To opt out in one file:

```javascript
// @ts-nocheck
```

### 6. Browser globals

Keep this in `tsconfig.json`:

```json
"lib": ["ES2023", "DOM", "DOM.Iterable"]
```

That gives TypeScript types for `document`, `window`, `HTMLElement`, `fetch`,
`AbortController`, `URL`, `Event`, `MouseEvent`.

## Suggested Coding Style for 2025 Vanilla JS

```javascript
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
- you can realistically build modern apps with native modules, no transpiler, no
  framework, almost no polyfills

The web platform is finally in a very good place for vanilla JS. Add JSDoc where
inference is not enough; let `tsc --noEmit` catch the rest.
