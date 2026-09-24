// @ts-nocheck
export function validate(instance) {
  const e = [];
  if (instance === null || typeof instance !== "object" || Array.isArray(instance)) {
    e.push({instancePath: "", schemaPath: "" + "/discriminator"});
  } else if (!("_type" in instance)) {
    e.push({instancePath: "", schemaPath: "" + "/discriminator"});
  } else if (typeof instance["_type"] !== "string") {
    e.push({instancePath: "" + "/_type", schemaPath: "" + "/discriminator"});
  } else if (instance["_type"] === "tray_moved") {
    if (instance === null || typeof instance !== "object" || Array.isArray(instance)) {
      e.push({instancePath: "", schemaPath: "" + "/mapping/tray_moved" + "/properties"});
    } else {
      if (!("case_id" in instance)) e.push({instancePath: "", schemaPath: "" + "/mapping/tray_moved" + "/properties/case_id"});
      else {
        if (typeof instance["case_id"] !== "string") e.push({instancePath: "" + "/case_id", schemaPath: "" + "/mapping/tray_moved" + "/properties/case_id" + "/type"});
      }
      if (!("from_tray" in instance)) e.push({instancePath: "", schemaPath: "" + "/mapping/tray_moved" + "/properties/from_tray"});
      else {
        if (typeof instance["from_tray"] !== "string") e.push({instancePath: "" + "/from_tray", schemaPath: "" + "/mapping/tray_moved" + "/properties/from_tray" + "/type"});
      }
      if (!("to_tray" in instance)) e.push({instancePath: "", schemaPath: "" + "/mapping/tray_moved" + "/properties/to_tray"});
      else {
        if (typeof instance["to_tray"] !== "string") e.push({instancePath: "" + "/to_tray", schemaPath: "" + "/mapping/tray_moved" + "/properties/to_tray" + "/type"});
      }
      if ("meta" in instance) {
      }
      for (const k in instance) {
        if (k !== "_type" && k !== "case_id" && k !== "from_tray" && k !== "to_tray" && k !== "meta") e.push({instancePath: "" + "/" + k, schemaPath: "" + "/mapping/tray_moved"});
      }
    }
  } else if (instance["_type"] === "tray_note_added") {
    if (instance === null || typeof instance !== "object" || Array.isArray(instance)) {
      e.push({instancePath: "", schemaPath: "" + "/mapping/tray_note_added" + "/properties"});
    } else {
      if (!("case_id" in instance)) e.push({instancePath: "", schemaPath: "" + "/mapping/tray_note_added" + "/properties/case_id"});
      else {
        if (typeof instance["case_id"] !== "string") e.push({instancePath: "" + "/case_id", schemaPath: "" + "/mapping/tray_note_added" + "/properties/case_id" + "/type"});
      }
      if (!("note" in instance)) e.push({instancePath: "", schemaPath: "" + "/mapping/tray_note_added" + "/properties/note"});
      else {
        if (typeof instance["note"] !== "string") e.push({instancePath: "" + "/note", schemaPath: "" + "/mapping/tray_note_added" + "/properties/note" + "/type"});
      }
      if ("meta" in instance) {
      }
      for (const k in instance) {
        if (k !== "_type" && k !== "case_id" && k !== "note" && k !== "meta") e.push({instancePath: "" + "/" + k, schemaPath: "" + "/mapping/tray_note_added"});
      }
    }
  } else {
    e.push({instancePath: "" + "/_type", schemaPath: "" + "/mapping"});
  }
  return e;
}
