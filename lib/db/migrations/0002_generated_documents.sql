CREATE TABLE IF NOT EXISTS "generated_documents" (
  "token"       text PRIMARY KEY,
  "filename"    text NOT NULL,
  "mime_type"   text NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  "session_id"  integer,
  "size_bytes"  integer NOT NULL,
  "content"     bytea NOT NULL,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  "expires_at"  timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "generated_documents_expires_at_idx"
  ON "generated_documents" ("expires_at");
