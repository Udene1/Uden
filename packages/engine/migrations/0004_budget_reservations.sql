-- Atomic monthly budget reservation state for concurrent graph executions.
CREATE TABLE IF NOT EXISTS budget_reservations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  released_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_reservation_reference ON budget_reservations(tenant_id, reference_id);
CREATE INDEX IF NOT EXISTS idx_budget_reservations_tenant_status ON budget_reservations(tenant_id, status, created_at);
