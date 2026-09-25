# Week note: lua-lunet/uvrr-core

uVRR — Unbounded Viewstamped Replication Revisited — as an embeddable,
FFI-friendly, sans-I/O replication core.

The week's work was the failover story, told as a rung ladder: a narrated,
bookmarkable walk through a view change. Rung seven ran the quorum race —
the primary's own ack lands first, the far backup's arrives mid-flight and
still counts, and the client's response fires at quorum. Rung eight was the
whole view change in one walk: heartbeats freeze, suspicion accrues,
start-view-change broadcasts, the new primary is elected on the identical
log, and service resumes. Rung nine was withdrawn — the ladder is now eight
bookmarks over 234 seconds, and reconfiguration returns in its own piece
another time.

Under the demo: human-facing names for the Status and wire Tag types
(encodings untouched), and the reincarnation rule pinned — an announcement
must be attributed to the new identity.

The video derivative draws the same beats as the simulation; when a rung
dies, its voice comes off the tail.
