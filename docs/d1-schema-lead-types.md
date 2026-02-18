# D1 Database Schema — Lead Types Addition

## When updating the Cloudflare Worker D1 schema, add:

### leads table — add column:
```sql
ALTER TABLE leads ADD COLUMN lead_type TEXT DEFAULT '';
```

### Valid lead_type enum values:
- `FEX`
- `VETERANS`
- `MORTGAGE PROTECTION`
- `TRUCKERS`
- `IUL`

### lead_sources table (new):
```sql
CREATE TABLE IF NOT EXISTS lead_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sheet_url TEXT NOT NULL,
  lead_type TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Index for filtering:
```sql
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
```
