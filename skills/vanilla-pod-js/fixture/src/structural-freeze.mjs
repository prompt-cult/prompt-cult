/**
 * Recursive Object.freeze at the validated perimeter.
 * Freezes the value and every nested object and array reachable from it.
 * Plain-JSON discipline: only own enumerable properties are walked.
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function structuralFreeze(value) {
  if (value === null || typeof value !== "object") {
    return /** @type {Readonly<T>} */ (value);
  }
  const target = /** @type {Record<string, unknown>} */ (value);
  if (Array.isArray(target)) {
    for (const item of /** @type {unknown[]} */ (target)) {
      structuralFreeze(item);
    }
  } else {
    for (const key of Object.keys(target)) {
      structuralFreeze(target[key]);
    }
  }
  Object.freeze(target);
  return /** @type {Readonly<T>} */ (value);
}
