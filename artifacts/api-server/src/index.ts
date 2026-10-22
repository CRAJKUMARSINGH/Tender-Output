import app from "./app";
import { logger } from "./lib/logger";
import { closeDb } from "@workspace/db/client";
import { startSweeper } from "./lib/doc-store.js";

startSweeper();
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await closeDb();
    process.exit(0);
  });
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
