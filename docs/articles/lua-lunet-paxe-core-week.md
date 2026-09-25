# Week note: lua-lunet/paxe-core

paxe-core is the PAXE datagram-encryption core that lunet-locks consumes.

The week cut a release and widened a pipe. Version 0.2.0 widened the
channel to u32 and now derives the payload length from the datagram's
geometry rather than assuming it. Version 0.3.0 added a startup check and
shipped two release flavours — self-contained, with sodium vendored, and
system-sodium, which links the system's library — with the release notes
explaining the two archives and the CI toolchain pinned with rustfmt and
clippy components.
