# Week note: lua-lunet/lunet-corfu

lunet-corfu is a model-driven first walking skeleton in the lunet
constellation — Corfu-style log service over the uVRR lineage.

The week was making Linux builds honest. The CI job pins rust 1.96 (the
lockfile resolved time 0.3.55 against it) and fetches a pinned Zig onto
PATH before the workspace build, because both the lunet-sn and aof build
scripts run zig for the engine archive. The linux x86_64 link now carries
Zig's stack-probe routine — the system-cc link has no zig compiler_rt to
provide it, and aarch64 does not probe. The link shims moved into a shared
build-dependency crate (sn-link-shims) so lunet-sn's test artifacts link
the archive exactly as the binary does. The lunet-advisory-lock pin was
refreshed to the hardened v0.2.0 tag's actual commit: the stale lockfile
carried the pre-hardening AOF submodule whose comptime AES assert pinned
the wrong CPU set on x86_64.
