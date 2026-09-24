// Codegen: reads schemas/*.jtd.json, emits generated/<stem>.mjs + web/validators.mjs barrel.
// Zero dependencies. Uses .bin/jtd-codegen when present (make init fetches it);
// otherwise verifies the committed generated validators and rebuilds the barrel only,
// so `make check` passes without network.
import { execFileSync } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "schemas");
const OUT_DIR = path.join(ROOT, "generated");
const WEB_DIR = path.join(ROOT, "web");
const BINARY = process.env.JTD_CODEGEN ?? path.join(ROOT, ".bin", "jtd-codegen");

// Barrel export names: validate + capitalized stem. The collection schema is
// semantically plural (a collection of case workspaces), so its export is plural.
const EXPORT_NAMES = {
  "case-workspace": "CaseWorkspaces",
  "tray-update": "TrayUpdate",
};

function exportName(stem) {
  const override = EXPORT_NAMES[stem];
  if (override) return "validate" + override;
  return "validate" + stem.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const schemas = (await readdir(SCHEMA_DIR)).filter((f) => f.endsWith(".jtd.json")).sort();
  if (schemas.length === 0) throw new Error("no .jtd.json schemas found");
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(WEB_DIR, { recursive: true });

  const haveBinary = await exists(BINARY);
  const barrelLines = [];

  for (const file of schemas) {
    const stem = file.replace(/\.jtd\.json$/, "");
    const outPath = path.join(OUT_DIR, `${stem}.mjs`);

    if (haveBinary) {
      const code = execFileSync(BINARY, ["--target", "js", path.join(SCHEMA_DIR, file)], {
        encoding: "utf8",
      });
      // Generated internals carry @ts-nocheck; handwritten code stays fully checked.
      await writeFile(outPath, "// @ts-nocheck\n" + code);
      console.log(`generated ${path.relative(ROOT, outPath)}`);
    } else {
      if (!(await exists(outPath))) {
        throw new Error(`no jtd-codegen binary at ${BINARY} and ${path.relative(ROOT, outPath)} is not committed`);
      }
      const committed = await readFile(outPath, "utf8");
      if (!committed.startsWith("// @ts-nocheck") || !committed.includes("export function validate(instance)")) {
        throw new Error(`committed ${path.relative(ROOT, outPath)} does not look like a generated validator`);
      }
      console.log(`using committed ${path.relative(ROOT, outPath)}`);
    }
    barrelLines.push(`export { validate as ${exportName(stem)} } from "../generated/${stem}.mjs";`);
  }

  await writeFile(path.join(WEB_DIR, "validators.mjs"), barrelLines.join("\n") + "\n");
  console.log("generated web/validators.mjs barrel");
}

main();
