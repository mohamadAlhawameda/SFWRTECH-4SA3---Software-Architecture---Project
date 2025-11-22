import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

DDL_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'CAD',
    category VARCHAR(64) NOT NULL,
    description TEXT,
    spent_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

SMOKE_INSERT = """
INSERT INTO expenses (amount, currency, category, description, spent_at)
VALUES (%s, %s, %s, %s, %s)
RETURNING id, amount, currency, category, description, spent_at, created_at;
"""

SMOKE_SELECT = """
SELECT id, amount, currency, category, description, spent_at, created_at
FROM expenses
ORDER BY id DESC
LIMIT 1;
"""

def main():
    assert DATABASE_URL, "DATABASE_URL is not set. Create a .env file from .env.example."
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=10, sslmode="require")
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(DDL_CREATE_TABLE)
            print("✅ Table ensured: expenses")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                SMOKE_INSERT,
                (23.45, "USD", "food", "sample lunch", "2025-10-25"),
            )
            inserted = cur.fetchone()
            print("✅ Inserted row:", inserted)

            cur.execute(SMOKE_SELECT)
            latest = cur.fetchone()
            print("✅ Latest row:", latest)

    except Exception as e:
        print("❌ Smoke test failed:", e)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
