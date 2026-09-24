/**
 * `_type` string tag + enum + exhaustive switch over the tray-update command
 * variants. Bounded set, no magic strings in handlers, default case throws.
 * No endpoint code — dispatch only.
 */

/** The bounded set of tray-update `_type` tags. */
export const TRAY_UPDATE_TYPES = Object.freeze(["tray_moved", "tray_note_added"]);

/**
 * @typedef {Object} TrayMovedUpdate
 * @property {"tray_moved"} _type
 * @property {string} case_id
 * @property {string} from_tray
 * @property {string} to_tray
 */

/**
 * @typedef {Object} TrayNoteAddedUpdate
 * @property {"tray_note_added"} _type
 * @property {string} case_id
 * @property {string} note
 */

/**
 * @typedef {TrayMovedUpdate | TrayNoteAddedUpdate} TrayUpdate
 */

/**
 * @template R
 * @typedef {Object} TrayUpdateHandlers
 * @property {(update: TrayMovedUpdate) => R} trayMoved
 * @property {(update: TrayNoteAddedUpdate) => R} trayNoteAdded
 */

/**
 * Exhaustive switch over the `_type` bounded set: every known tag has a case,
 * the default case throws on unknown tags, and a handlers object that misses a
 * case is a compile error under `tsc --noEmit` (proven via @ts-expect-error in
 * test/kernel.test.mjs).
 *
 * @template R
 * @param {TrayUpdate} update
 * @param {TrayUpdateHandlers<R>} handlers
 * @returns {R}
 */
export function switchTrayUpdate(update, handlers) {
  switch (update._type) {
    case "tray_moved":
      return handlers.trayMoved(update);
    case "tray_note_added":
      return handlers.trayNoteAdded(update);
    default:
      throw new Error(`Unknown _type: ${JSON.stringify(update)}`);
  }
}
