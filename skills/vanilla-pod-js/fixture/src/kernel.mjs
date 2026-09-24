/**
 * Full-arity fetcher kernel: (config, obs, fetchAssembly, ctx, predicate) ->
 * AsyncGenerator of frozen, validated rows from an NDJSON line stream.
 *
 * Fail-closed policy (ruling 5): the first malformed or invalid row throws;
 * the kernel never yields unvalidated data and never silently drops a row.
 * The "endpoint" is the injected fetchAssembly — this module contains no
 * server-side or endpoint-implementation code.
 */
import { structuralFreeze } from "./structural-freeze.mjs";

/**
 * @typedef {{instancePath: string, schemaPath: string}} ValidationError
 * @typedef {(instance: any) => ValidationError[]} Validator
 * @typedef {{name: string, validate: Validator}} KernelConfig
 * @typedef {{info: (message: string, meta?: Record<string, unknown>) => void, warn: (message: string, meta?: Record<string, unknown>) => void}} Observability
 * @typedef {(config: KernelConfig, ctx: unknown, predicate: unknown) => AsyncIterable<string> | Promise<AsyncIterable<string>>} FetchAssembly
 * @typedef {{line: number, reason: string, raw?: string}} RowFailure
 */

/** Error thrown by the kernel when a row fails; carries the row diagnostics. */
export class KernelRowError extends Error {
  /**
   * @param {string} schemaName
   * @param {RowFailure} failure
   */
  constructor(schemaName, failure) {
    super(`[${schemaName}] row ${failure.line}: ${failure.reason}`);
    this.name = "KernelRowError";
    this.schemaName = schemaName;
    this.failure = failure;
  }
}

/**
 * @param {KernelConfig} config
 * @param {number} line
 * @param {string} reason
 * @param {string} [raw]
 * @returns {KernelRowError}
 */
function rowError(config, line, reason, raw) {
  return new KernelRowError(config.name, { line, reason, ...(raw === undefined ? {} : { raw }) });
}

/**
 * @param {KernelConfig} config
 * @param {Observability} obs
 * @param {FetchAssembly} fetchAssembly
 * @param {unknown} ctx
 * @param {unknown} predicate
 * @yields {Readonly<Record<string, unknown>>}
 * @returns {AsyncGenerator<Readonly<Record<string, unknown>>, void, undefined>}
 */
export async function* fetcherKernel(config, obs, fetchAssembly, ctx, predicate) {
  const lines = await fetchAssembly(config, ctx, predicate);
  let line = 0;
  for await (const raw of lines) {
    line += 1;
    if (typeof raw !== "string" || raw.trim() === "") {
      continue;
    }
    let instance;
    try {
      instance = JSON.parse(raw);
    } catch {
      throw rowError(config, line, "malformed JSON line", raw);
    }
    const errors = config.validate(instance);
    if (errors.length > 0) {
      throw rowError(config, line, `validation failed ${JSON.stringify(errors)}`, raw);
    }
    obs.info(`accepted row ${line}`, { schema: config.name });
    yield structuralFreeze(instance);
  }
}
