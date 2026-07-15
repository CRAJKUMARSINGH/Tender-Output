/**
 * Netlify serverless function — wraps the PWD NIT Express API.
 *
 * We create a fresh Express instance here (without pino-http, which spawns
 * worker threads that are incompatible with serverless environments) and
 * mount the exact same router used by the long-running server.
 *
 * Netlify redirects all /api and /api/* requests to this function while
 * preserving the original URL path, so Express sees /api/contractors etc.
 * as expected.
 */

import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import router from "../../artifacts/api-server/src/routes/index.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// 10 MB limit to accommodate base64-encoded PDF uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Mount under /api — matches the redirect target (/api/*) and the orval
// baseUrl ("/api") used by the React frontend.
app.use("/api", router);

export const handler = serverless(app, {
  // Pass the raw binary for document downloads
  binary: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
});
