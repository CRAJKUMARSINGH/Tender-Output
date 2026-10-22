import type { RequestHandler } from "express";

/** Return 501 with a clear reason when filesystem routes can't work. */
export function requireFilesystem(): RequestHandler {
  return (_req, res, next) => {
    const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (serverless && process.env.ALLOW_FS_ROUTES !== "1") {
      return res.status(501).json({
        error:
          "Filesystem routes are unavailable in this deployment. " +
          "Use /parse/tender-case and /documents/generate instead, or set ALLOW_FS_ROUTES=1.",
      });
    }
    return next();
  };
}
