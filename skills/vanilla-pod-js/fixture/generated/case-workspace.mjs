// @ts-nocheck
export function validate(instance) {
  const e = [];
  if (!Array.isArray(instance)) {
    e.push({instancePath: "", schemaPath: "" + "/elements"});
  } else {
    for (let i = 0; i < instance.length; i++) {
      if (instance[i] === null || typeof instance[i] !== "object" || Array.isArray(instance[i])) {
        e.push({instancePath: "" + "/" + i, schemaPath: "" + "/elements" + "/properties"});
      } else {
        if (!("case_id" in instance[i])) e.push({instancePath: "" + "/" + i, schemaPath: "" + "/elements" + "/properties/case_id"});
        else {
          if (typeof instance[i]["case_id"] !== "string") e.push({instancePath: "" + "/" + i + "/case_id", schemaPath: "" + "/elements" + "/properties/case_id" + "/type"});
        }
        if (!("case_name" in instance[i])) e.push({instancePath: "" + "/" + i, schemaPath: "" + "/elements" + "/properties/case_name"});
        else {
          if (typeof instance[i]["case_name"] !== "string") e.push({instancePath: "" + "/" + i + "/case_name", schemaPath: "" + "/elements" + "/properties/case_name" + "/type"});
        }
        if ("owner" in instance[i]) {
          if (typeof instance[i]["owner"] !== "string") e.push({instancePath: "" + "/" + i + "/owner", schemaPath: "" + "/elements" + "/optionalProperties/owner" + "/type"});
        }
        if ("priority" in instance[i]) {
          if (typeof instance[i]["priority"] !== "string" || !["low","normal","high"].includes(instance[i]["priority"])) e.push({instancePath: "" + "/" + i + "/priority", schemaPath: "" + "/elements" + "/optionalProperties/priority" + "/enum"});
        }
        for (const k in instance[i]) {
          if (k !== "case_id" && k !== "case_name" && k !== "owner" && k !== "priority") e.push({instancePath: "" + "/" + i + "/" + k, schemaPath: "" + "/elements"});
        }
      }
    }
  }
  return e;
}
