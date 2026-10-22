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
import {
  notFoundHandler,
  errorHandler,
} from "../../artifacts/api-server/src/middlewares/error.js";
import { apiKeyAuth } from "../../artifacts/api-server/src/middlewares/auth.js";
import { rateLimit } from "../../artifacts/api-server/src/middlewares/rate-limit.js";
import { requireFilesystem } from "../../artifacts/api-server/src/middlewares/fs-guard.js";
import { corsOrigins } from "../../artifacts/api-server/src/lib/cors.js";

const app = express();

app.set("trust proxy", 1); // needed for req.ip behind Netlify
app.use(
  cors({
    origin: corsOrigins(),
    credentials: true,
  }),
);

// 25 MB limit to match app.ts (was 10 MB — the parity fix never reached production)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Global brake, then the expensive vision route, then auth — mirrors app.ts.
app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));
app.use("/api/parse/image-upload", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "vision" }));
app.use("/api/parse/excel-upload", rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "excel" }));
app.use("/api", apiKeyAuth());

app.use("/api/parse/folder", requireFilesystem());
app.use("/api/documents/generate-batch", requireFilesystem());

// Mount under /api — matches the redirect target (/api/*) and the orval
// baseUrl ("/api") used by the React frontend.
app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export const handler = serverless(app, {
  // Pass the raw binary for document downloads
  binary: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
});
