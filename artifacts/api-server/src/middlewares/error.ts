import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number })?.statusCode ??
    500;

  // pino-http attaches req.log; the serverless wrapper does not
  (req as { log?: { error?: (o: object, m: string) => void } }).log?.error?.(
    { err },
    "unhandled error",
  );

  if (res.headersSent) return;
  res
    .status(status)
    .json({ error: err instanceof Error ? err.message : String(err) });
};
