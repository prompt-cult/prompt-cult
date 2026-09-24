import { structuralFreeze } from "./structural-freeze.mjs";

/**
 * Pure map presentation projection: derives a NEW frozen array from rows.
 * Never mutates the wire DTOs it reads.
 * @template T
 * @template R
 * @param {ReadonlyArray<T>} rows
 * @param {(row: T, index: number) => R} project
 * @returns {ReadonlyArray<R>}
 */
export function projectMap(rows, project) {
  return structuralFreeze(rows.map((row, index) => project(row, index)));
}

/**
 * Pure flatMap presentation projection: derives a NEW frozen array from rows.
 * Never mutates the wire DTOs it reads.
 * @template T
 * @template R
 * @param {ReadonlyArray<T>} rows
 * @param {(row: T, index: number) => ReadonlyArray<R>} project
 * @returns {ReadonlyArray<R>}
 */
export function projectFlatMap(rows, project) {
  return structuralFreeze(rows.flatMap((row, index) => project(row, index)));
}
