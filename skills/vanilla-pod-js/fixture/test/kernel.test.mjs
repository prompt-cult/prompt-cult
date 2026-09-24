import test from "node:test";
import assert from "node:assert/strict";
import { validateCaseWorkspaces, validateTrayUpdate } from "../web/validators.mjs";
import { validate as rawValidateCaseWorkspaces } from "../generated/case-workspace.mjs";
import { validate as rawValidateTrayUpdate } from "../generated/tray-update.mjs";
import { fetcherKernel, KernelRowError } from "../src/kernel.mjs";
import { structuralFreeze } from "../src/structural-freeze.mjs";
import { projectMap, projectFlatMap } from "../src/projections.mjs";
import { TRAY_UPDATE_TYPES, switchTrayUpdate } from "../src/switch-types.mjs";

/** @returns {import("../src/switch-types.mjs").TrayMovedUpdate} */
function movedUpdate() {
  return { _type: "tray_moved", case_id: "CNA-2041", from_tray: "intake", to_tray: "review" };
}

/** @returns {import("../src/switch-types.mjs").TrayNoteAddedUpdate} */
function noteUpdate() {
  return { _type: "tray_note_added", case_id: "CNA-2041", note: "picked up by Alice" };
}

/**
 * @typedef {Object} CaseWorkspace
 * @property {string} case_id
 * @property {string} case_name
 * @property {string} [owner]
 * @property {"low" | "normal" | "high"} [priority]
 */

/** @returns {ReadonlyArray<CaseWorkspace>} */
function workspaceCollection() {
  return [
    { case_id: "CNA-2041", case_name: "Malware triage", owner: "Alice", priority: "high" },
    { case_id: "CNA-2042", case_name: "Phishing review" },
  ];
}

/** @returns {{infos: string[], info: (message: string) => void, warn: (message: string) => void}} */
function recordingObs() {
  const infos = /** @type {string[]} */ ([]);
  return {
    infos,
    info: (message) => {
      infos.push(message);
    },
    warn: (message) => {
      infos.push(`WARN ${message}`);
    },
  };
}

/**
 * Fake NDJSON line stream (the injected "endpoint").
 * @param {string[]} lines
 * @returns {AsyncGenerator<string, void, undefined>}
 */
async function* lineStream(lines) {
  for (const line of lines) {
    yield line;
  }
}

/**
 * Drain an async generator to an array.
 * @template T
 * @param {AsyncGenerator<T, void, undefined>} gen
 * @returns {Promise<T[]>}
 */
async function collect(gen) {
  const out = [];
  for await (const row of gen) {
    out.push(row);
  }
  return out;
}

/**
 * Kernel config: assembly binds the stable dependency (the committed validator) once.
 * @param {(instance: any) => Array<{instancePath: string, schemaPath: string}>} validate
 * @returns {{name: string, validate: (instance: any) => Array<{instancePath: string, schemaPath: string}>}}
 */
function configFor(validate) {
  return { name: "tray-update", validate };
}

test("proof 1: valid case-workspace collection and tray-updates are accepted (empty error array)", () => {
  assert.deepEqual(validateCaseWorkspaces(workspaceCollection()), []);
  assert.deepEqual(validateTrayUpdate(movedUpdate()), []);
  assert.deepEqual(validateTrayUpdate(noteUpdate()), []);
});

test("proof 2: wrong-type, missing-required, undeclared-extra rejected with (instancePath, schemaPath) pairs", () => {
  const wrongType = [{ case_id: 42, case_name: "Malware triage" }];
  const wrongTypeErrors = validateCaseWorkspaces(wrongType);
  assert.ok(wrongTypeErrors.length > 0, "wrong type must be rejected");
  assert.ok(
    wrongTypeErrors.some((e) => e.instancePath === "/0/case_id" && e.schemaPath === "/elements/properties/case_id/type"),
    JSON.stringify(wrongTypeErrors),
  );

  const missingRequired = [{ case_name: "Phishing review" }];
  const missingErrors = validateCaseWorkspaces(missingRequired);
  assert.ok(
    missingErrors.some((e) => e.instancePath === "/0" && e.schemaPath === "/elements/properties/case_id"),
    JSON.stringify(missingErrors),
  );

  const undeclaredExtra = [{ case_id: "CNA-1", case_name: "x", extra: true }];
  const extraErrors = validateCaseWorkspaces(undeclaredExtra);
  assert.ok(
    extraErrors.some((e) => e.instancePath === "/0/extra" && e.schemaPath === "/elements"),
    JSON.stringify(extraErrors),
  );

  const badTag = { ...movedUpdate(), _type: "tray_exploded" };
  const tagErrors = validateTrayUpdate(badTag);
  assert.ok(tagErrors.some((e) => e.schemaPath === "/mapping"), JSON.stringify(tagErrors));
});

test("proof 3: barrel exports differentiated names; no name collisions", () => {
  assert.equal(typeof validateCaseWorkspaces, "function");
  assert.equal(typeof validateTrayUpdate, "function");
  assert.equal(typeof rawValidateCaseWorkspaces, "function");
  assert.equal(typeof rawValidateTrayUpdate, "function");
  assert.notEqual(validateCaseWorkspaces, validateTrayUpdate);
  assert.notEqual(rawValidateCaseWorkspaces, rawValidateTrayUpdate);
  assert.equal(validateCaseWorkspaces, rawValidateCaseWorkspaces);
  assert.equal(validateTrayUpdate, rawValidateTrayUpdate);
  assert.deepEqual(validateCaseWorkspaces(workspaceCollection()), []);
  assert.ok(validateTrayUpdate(workspaceCollection()).length > 0, "barrel names must stay wired to their own validators");
});

test("proof 4a: kernel yields frozen validated rows from an injected NDJSON line-stream", async () => {
  const config = configFor(validateTrayUpdate);
  const obs = recordingObs();
  const lines = [JSON.stringify(movedUpdate()), JSON.stringify(noteUpdate())];
  const predicate = { caseId: "CNA-2041" };
  const ctx = { requestId: "test-1" };
  const rows = await collect(fetcherKernel(config, obs, () => lineStream(lines), ctx, predicate));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], movedUpdate());
  assert.deepEqual(rows[1], noteUpdate());
  assert.equal(Object.isFrozen(rows[0]), true);
  assert.ok(obs.infos.length === 2, "observability sees every accepted row");
});

test("proof 4b: kernel fails closed on the first bad row mid-stream", async () => {
  const config = configFor(validateTrayUpdate);
  const obs = recordingObs();
  const badLine = JSON.stringify({ ...movedUpdate(), extra: "undeclared" });
  const lines = [JSON.stringify(movedUpdate()), badLine, JSON.stringify(noteUpdate())];
  const yielded = /** @type {Readonly<Record<string, unknown>>[]} */ ([]);
  await assert.rejects(
    async () => {
      for await (const row of fetcherKernel(config, obs, () => lineStream(lines), {}, {})) {
        yielded.push(row);
      }
    },
    /** @param {unknown} err */
    (err) => err instanceof KernelRowError && /validation failed/.test(err.message) && err.failure.line === 2,
  );
  assert.equal(yielded.length, 1, "only the rows before the bad row may be yielded");
  assert.deepEqual(yielded[0], movedUpdate());
});

test("proof 4c: kernel fails closed on a malformed JSON line", async () => {
  const config = configFor(validateTrayUpdate);
  const obs = recordingObs();
  await assert.rejects(
    async () => collect(fetcherKernel(config, obs, () => lineStream(["{not json"]), {}, {})),
    /** @param {unknown} err */
    (err) => err instanceof KernelRowError && /malformed JSON line/.test(err.message),
  );
});

test("proof 4d: kernel on an empty stream yields zero rows, not null", async () => {
  const config = configFor(validateTrayUpdate);
  const obs = recordingObs();
  const rows = await collect(fetcherKernel(config, obs, () => lineStream([]), {}, {}));
  assert.equal(Array.isArray(rows), true);
  assert.deepEqual(rows, []);
});

test("proof 5a: kernel rows and all nested objects/arrays are deeply frozen", async () => {
  const config = configFor(validateTrayUpdate);
  const obs = recordingObs();
  const nested = JSON.stringify({ ...noteUpdate(), meta: { tags: ["a", "b"] } });
  const rows = await collect(fetcherKernel(config, obs, () => lineStream([nested]), {}, {}));
  /** @param {unknown} value @returns {boolean} */
  function isDeepFrozen(value) {
    if (value === null || typeof value !== "object") return true;
    if (!Object.isFrozen(value)) return false;
    return Object.values(value).every(isDeepFrozen);
  }
  assert.equal(isDeepFrozen(rows[0]), true);
});

test("proof 5b: structuralFreeze freezes deeply and returns the same root", () => {
  const dto = { a: { b: [{ c: 2 }, { c: 3 }] } };
  const frozen = structuralFreeze(dto);
  assert.equal(frozen, dto);
  assert.equal(Object.isFrozen(dto), true);
  assert.equal(Object.isFrozen(dto.a), true);
  assert.equal(Object.isFrozen(dto.a.b), true);
  assert.equal(Object.isFrozen(dto.a.b[1]), true);
  assert.throws(() => {
    dto.a.b[1].c = 99;
  });
});

test("proof 5c: projections create NEW frozen values and never mutate wire DTOs", () => {
  const wire = workspaceCollection().map((w) => structuralFreeze({ ...w }));
  const before = JSON.stringify(wire);

  const labels = projectMap(wire, (w) => ({ id: w.case_id, name: w.case_name }));
  assert.equal(Object.isFrozen(labels), true);
  assert.equal(Object.isFrozen(labels[0]), true);
  assert.notEqual(labels, wire, "projection must be a new value");
  assert.deepEqual(labels, [
    { id: "CNA-2041", name: "Malware triage" },
    { id: "CNA-2042", name: "Phishing review" },
  ]);

  const idsPerOwner = projectFlatMap(wire, (w) => (w.owner ? [`${w.owner}:${w.case_id}`] : []));
  assert.deepEqual(idsPerOwner, ["Alice:CNA-2041"]);
  assert.equal(Object.isFrozen(idsPerOwner), true);

  assert.equal(JSON.stringify(wire), before, "wire DTOs must not be mutated by projections");
});

test("proof 6a: `_type` exhaustive switch handles each known tag and throws on unknown tags", () => {
  assert.deepEqual(TRAY_UPDATE_TYPES, ["tray_moved", "tray_note_added"]);
  /** @param {import("../src/switch-types.mjs").TrayUpdate} u @returns {string} */
  const describe = (u) =>
    switchTrayUpdate(u, {
      trayMoved: (m) => `moved ${m.case_id} ${m.from_tray}->${m.to_tray}`,
      trayNoteAdded: (n) => `note ${n.case_id}: ${n.note}`,
    });
  assert.equal(describe(movedUpdate()), "moved CNA-2041 intake->review");
  assert.equal(describe(noteUpdate()), "note CNA-2041: picked up by Alice");
  assert.throws(() =>
    // @ts-expect-error an unknown `_type` is a type error and a runtime throw
    describe({ ...movedUpdate(), _type: "tray_exploded" }), /Unknown _type/);
});

test("proof 6b: a handlers object missing a case fails tsc --noEmit (kept as a compile error via @ts-expect-error)", () => {
  // @ts-expect-error missing trayNoteAdded case must fail tsc --noEmit
  const partial = switchTrayUpdate(movedUpdate(), { trayMoved: (m) => m.case_id });
  assert.equal(partial, "CNA-2041");
});
