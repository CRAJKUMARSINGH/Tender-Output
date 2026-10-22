import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { notFoundHandler, errorHandler } from "./middlewares/error.js";
import { apiKeyAuth } from "./middlewares/auth.js";
import { rateLimit } from "./middlewares/rate-limit.js";
import { requireFilesystem } from "./middlewares/fs-guard.js";
import { corsOrigins } from "./lib/cors.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1); // needed for req.ip behind Netlify
app.use(cors({ origin: corsOrigins(), credentials: true }));
// 25 MB limit — folder workflow + multiple PDFs base64-encoded can be large (B15)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Global brake first, then the expensive vision route, then auth.
app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));
app.use("/api/parse/image-upload", rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "vision" }));
app.use("/api/parse/excel-upload", rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "excel" }));
app.use("/api", apiKeyAuth());

app.use("/api/parse/folder", requireFilesystem());
app.use("/api/documents/generate-batch", requireFilesystem());

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
