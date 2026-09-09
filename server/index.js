import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createMysqlPool, MysqlCommunityStore } from "./mysql-store.js";

const config = loadConfig();
const store = new MysqlCommunityStore(createMysqlPool(config.database));
await store.ping();
await store.pruneExpiredData();
const maintenanceTimer = setInterval(() => {
  store.pruneExpiredData().catch((error) => {
    console.error(JSON.stringify({ level: "error", message: "glfans API maintenance failed", error: error.message }));
  });
}, 6 * 60 * 60 * 1000);
maintenanceTimer.unref();

const server = createServer(createApp({ store, config }));
server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    level: "info",
    message: "glfans API started",
    address: `${config.host}:${config.port}`,
  }));
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(maintenanceTimer);
  console.log(JSON.stringify({ level: "info", message: "glfans API stopping", signal }));
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
