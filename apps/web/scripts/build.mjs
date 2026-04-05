import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { loadWebConfig } from "../src/config.mjs";
import { renderAppShell } from "../src/shell.mjs";

const output = resolve("dist/index.html");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${renderAppShell(loadWebConfig())}\n`, "utf8");
