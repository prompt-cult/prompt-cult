# Week note: lua-lunet/tbio-core

tbio-core is the TigerBeetle IO subsystem, studied and rebuilt for the
lunet constellation.

The week put a boot-read law in place: checksum rot refuses loudly instead
of limping on, thresholds log their spread, and blocks carry readable state
strings. The native build target now reads the cargo target arch for its
CPU feature set — the vendored checksum's comptime assert needs both aes
and avx on x86_64, so a native amd64 build carries baseline plus aes plus
avx, where baseline plus aes alone left the assert unreachable.
