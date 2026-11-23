import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const files = [];
const failures = [];

function scan(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (["node_modules", "dist", "generated", "coverage"].includes(name)) continue;
    if (statSync(path).isDirectory()) scan(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(path);
  }
}

scan(join(root, "frontend/src"));
scan(join(root, "backend/src"));

for (const file of files) {
  if (file.endsWith("routeTree.gen.ts")) continue;
  const content = readFileSync(file, "utf8");
  const id = relative(root, file);
  if (content.split("\n").length > 501) failures.push(`${id}: >500 source lines`);
  if (id.startsWith("frontend/") && /from ["'][^"']*backend\//.test(content)) {
    failures.push(`${id}: imports backend`);
  }
  if (id.startsWith("backend/") && /from ["'][^"']*frontend\//.test(content)) {
    failures.push(`${id}: imports frontend`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Architecture audit passed for ${files.length} handwritten source files`);
