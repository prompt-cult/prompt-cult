# How To Use Teal For Build Tooling

Typed build/test tooling in [Teal](https://github.com/teal-language/tl) instead of
shell scripts. Teal is a statically-typed dialect of Lua that compiles to plain Lua;
the `tl` loader compiles `.tl` modules in memory, so `require` works directly with no
build step.

Verified on:

| Component | Version |
|-----------|---------|
| macOS | 26.5.2, arm64 (Apple Silicon) |
| LuaJIT | 2.1 |
| LuaRocks | 3.13.0 |
| Teal (`tl`) | 0.24.8 |

## Why

Shell scripts have no types, no real data structures, and fail silently in a hundred
ways. Tooling that provisions databases, seeds fixtures and drives test suites is
real logic and deserves a real language. Teal gives compile-time checking; Lua gives
a tiny runtime with no dependency sprawl.

## 1. Install `tl` against the right ABI

The single most common mistake. If your system Lua is 5.5 (Homebrew's default is now
5.5) but you run tooling under LuaJIT, a default `luarocks install tl` installs into
the **5.5** tree and `require("tl")` fails under LuaJIT.

LuaJIT is ABI-compatible with **Lua 5.1**, so pin the version explicitly:

```bash
brew install luajit luarocks
luarocks --lua-version=5.1 install tl
```

Verify it landed in the 5.1 tree:

```bash
luarocks --lua-version=5.1 list tl
luarocks --lua-version=5.1 path --lr-path
# => /Users/you/.luarocks/share/lua/5.1/?.lua;...
```

If LuaRocks cannot find LuaJIT's headers, point it at the install:

```bash
luarocks --lua-version=5.1 --lua-dir=/opt/homebrew/opt/luajit install tl
```

C modules (e.g. `luasocket`) install the same way and land in the matching `--lr-cpath`
tree:

```bash
luarocks --lua-version=5.1 install luasocket
```

## 2. Layout

Keep tooling in a clearly named top-level folder, separate from application code:

```
Makefile
tooling/
  bootstrap.lua      # shared prelude: resolves rocks tree + Teal loader
  fib.lua            # executable entry point (chmod +x)
  lib/
    fib.tl           # typed library module
```

Entry points are `.lua` (they need the shebang and must run before the loader
exists). Everything they call is `.tl` and type-checked.

## 3. The typed module (`tooling/lib/fib.tl`)

Declare a `record` describing the module's exported shape, then implement it. The
record is the contract — `tl check` verifies the implementation matches.

```lua
-- A typed tooling library module.

local record M
   fib: function(integer): integer
   sequence: function(integer): {integer}
end

function M.fib(n: integer): integer
   if n < 2 then
      return n
   end
   local a, b = 0, 1
   for _ = 2, n do
      a, b = b, a + b
   end
   return b
end

function M.sequence(count: integer): {integer}
   local out: {integer} = {}
   for i = 0, count - 1 do
      table.insert(out, M.fib(i))
   end
   return out
end

return M
```

Types worth knowing: `{integer}` is an array of integers, `{string:string}` is a map,
`function(integer): integer` is a function type, and `nil` is tracked separately so
optional values must be handled.

## 4. The bootstrap prelude (`tooling/bootstrap.lua`)

The problem: `require("tl")` only works if `LUA_PATH` already points at the rocks
tree. You cannot expect every caller (Make, CI, a developer's shell) to have sourced
`eval "$(luarocks path)"` first.

The fix: ask LuaRocks for the paths at runtime, once, then activate the loader.

```lua
-- Resolve the LuaJIT (5.1) rocks tree without a pre-sourced LUA_PATH,
-- activate the Teal loader, and make sibling modules requirable from any cwd.

local here = arg[0]:match("^(.*)/[^/]*$") or "."

local function lr(which)
   local pipe = io.popen("luarocks --lua-version=5.1 path --lr-" .. which .. " 2>/dev/null")
   local out = pipe and pipe:read("*l") or nil
   if pipe then pipe:close() end
   return out
end

if not pcall(require, "tl") then
   local p, c = lr("path"), lr("cpath")
   if p and #p > 0 then package.path = p .. ";" .. package.path end
   if c and #c > 0 then package.cpath = c .. ";" .. package.cpath end
end

local ok, tl = pcall(require, "tl")
if not ok then
   io.stderr:write("ERROR: Teal (tl) not installed for the LuaJIT 5.1 ABI. Run: make init\n")
   os.exit(1)
end
tl.loader()

package.path = here .. "/?.lua;" .. here .. "/?.tl;" .. package.path

return here
```

Three things matter here:

- **`pcall` first.** If the environment is already set up, skip the `luarocks`
  subprocess entirely.
- **`tl.loader()`** installs a package searcher so `require("lib.fib")` finds
  `lib/fib.tl` and compiles it in memory. No `tl gen`, no generated `.lua` files
  in the tree.
- **Resolve paths from `arg[0]`, never the cwd.** Otherwise the script only works
  when invoked from the project root.

## 5. The entry point (`tooling/fib.lua`)

```lua
#!/usr/bin/env -S luajit
-- Entry point: `make fib` runs this.

dofile((arg[0]:match("^(.*)/[^/]*$") or ".") .. "/bootstrap.lua")

local fib = require("lib.fib")

local count = tonumber(arg[1] or "10")
print("fib sequence (" .. count .. "): " .. table.concat(fib.sequence(count), " "))
```

Make it executable:

```bash
chmod +x tooling/fib.lua
```

### About the shebang

Use `#!/usr/bin/env -S luajit`.

The `-S` belongs to **`env`**, not to `luajit`. It tells `env` to split the remainder
of the shebang line into separate arguments. Classic `execve` passes everything after
the interpreter as a *single* argument, so without `-S` a shebang like
`#!/usr/bin/env luajit -e ...` would look for a program literally named
`"luajit -e ..."`.

You only strictly need `-S` when passing flags, but using it consistently means
adding a flag later does not silently break the script. `-S` is supported by GNU
coreutils and modern macOS/BSD `env`.

## 6. The Makefile

`init` installs the toolchain so a fresh clone works with one command; `check`
type-checks; targets call the executables directly.

```make
.PHONY: init check fib

init:
	@command -v luarocks >/dev/null 2>&1 || { echo "ERROR: install luarocks (brew install luarocks)"; exit 1; }
	@luarocks --lua-version=5.1 list tl 2>/dev/null | grep -q "^tl$$" \
		|| luarocks --lua-version=5.1 install tl
	@echo "tl (Teal, LuaJIT 5.1 ABI): OK"

check:
	@eval "$$(luarocks --lua-version=5.1 path)" && tl check tooling/lib/*.tl

fib:
	@tooling/fib.lua 10
```

Note the doubled `$$` — Make eats a single `$`. The `list | grep -q` guard makes
`init` idempotent, so it is cheap to run repeatedly.

## 7. Run it

```console
$ make init
tl (Teal, LuaJIT 5.1 ABI): OK

$ make check
Type checked tooling/lib/fib.tl
0 errors detected

$ make fib
fib sequence (10): 0 1 1 2 3 5 8 13 21 34
```

And from a clean environment, from any directory — the bootstrap does its job:

```console
$ cd /tmp && env -u LUA_PATH -u LUA_CPATH /path/to/tooling/fib.lua 8
fib sequence (8): 0 1 1 2 3 5 8 13
```

## 8. The payoff: errors caught before runtime

```lua
local record M
   f: function(integer): integer
end
function M.f(n: integer): integer
   return "not a number"
end
return M
```

```console
$ tl check tooling/lib/bad.tl
tooling/lib/bad.tl:4:14: unused argument n: integer
tooling/lib/bad.tl:5:11: in return value: got string "not a number", expected integer
```

A shell script would have shipped that.

## 9. Typing third-party modules

Rocks like `luasocket` ship no type information, and `tl check` reports
`no type information for required module: 'socket'`. Write a declaration file named
after the module — `socket.d.tl` — describing only the parts you use:

```lua
local record TcpSocket
   settimeout: function(TcpSocket, number)
   connect: function(TcpSocket, string, integer): boolean, string
   send: function(TcpSocket, string): integer, string
   close: function(TcpSocket)
end

local record socket
   tcp: function(): TcpSocket
   sleep: function(number)
end

return socket
```

Place it where `tl` searches (alongside your tooling), and `require("socket")` is
typed. Declare the subset you actually call, not the whole API.

## Gotchas

- **Wrong ABI tree.** Always pass `--lua-version=5.1` for LuaJIT. Omitting it
  installs into the system Lua tree and `require("tl")` fails at runtime.
- **`-S` is an `env` flag.** Not a `luajit` flag.
- **`os.execute` return values differ.** Lua 5.1 returns a numeric exit status;
  5.2+ returns a boolean. Teal's stdlib types assume the modern signature, so
  compare against `true` and let the type checker keep you honest.
- **`.d.tl` files declare, never implement.** They carry no runtime code.
- **Don't wrap trivial commands.** A plain `psql -f schema.sql` in a Makefile is
  fine as-is. Port to Teal when there is real logic — branching, parsing, data
  structures — not for its own sake.


---

## Historical footnote

Content present in earlier revisions of this document but absent from the
newest version, preserved verbatim from the capture (pairwise reduction
newest → oldest). Each chunk is labelled with the revision it last appeared
in. Nothing here is current guidance — it is lost-idea recovery for the later
extraction passes.

Pairwise reduction over all 1 earlier revisions found no content absent from the newest version.
