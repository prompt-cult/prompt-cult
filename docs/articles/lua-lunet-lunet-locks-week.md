# Week note: lua-lunet/lunet-locks

lunet-locks is an advisory locks server built on the Rust FFI uVRR core.

The week was integration and CI: the PAXE datagram-encryption core came in
at v0.2.0 and went out again as v0.3.0 (startup check, a sodium-dynamic
flavour, a release pipeline). The docker simulation's CI lane needed the
packages scope to pull its pinned AOF artifact from ghcr, and the macOS
lane moved to the macos-14 image — Zig 0.14.1 cannot link the build runner
against the macOS 26 SDK that macos-latest ships. The project tree now owns
luasocket: Debian happens to pull lua-socket system-wide, brew does not, so
the bootstrap's fallback cpath carries the project's own C rocks.

In flight: the signal matrix and the live hard gate — every catchable exit
is the clean stop.
