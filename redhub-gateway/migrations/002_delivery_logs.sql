CREATE TABLE IF NOT EXISTS delivery_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id VARCHAR(128) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64),
  message_type VARCHAR(16) NOT NULL CHECK (message_type IN ('TEXT', 'DOCUMENT')),
  destination_masked VARCHAR(32) NOT NULL,
  provider_message_id TEXT,
  result VARCHAR(16) NOT NULL CHECK (result IN ('SENT', 'FAILED')),
  error_code VARCHAR(64),
  error_message VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_logs_tenant_created_idx
  ON delivery_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_logs_request_idx
  ON delivery_logs (request_id);
