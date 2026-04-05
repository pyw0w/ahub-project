import { createServer } from "node:http";

import { loadWebConfig } from "./config.mjs";
import { renderAppShell } from "./shell.mjs";

const config = loadWebConfig();

createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderAppShell(config));
}).listen(config.port, () => {
  console.log(`AHub web shell listening on http://localhost:${config.port}`);
});
