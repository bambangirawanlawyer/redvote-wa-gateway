CREATE TABLE IF NOT EXISTS gateway_runtime_meta (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  service_name TEXT NOT NULL,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gateway_runtime_meta (id, service_name)
VALUES (1, 'redhub-wa-gateway')
ON CONFLICT (id) DO NOTHING;
