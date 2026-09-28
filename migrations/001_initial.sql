BEGIN;

CREATE TABLE IF NOT EXISTS gateway_devices (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gateway_devices (id, display_name)
VALUES ('primary', 'Primary WhatsApp Device')
ON CONFLICT (id) DO NOTHING;

COMMIT;
