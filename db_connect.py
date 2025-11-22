import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    assert DATABASE_URL, "DATABASE_URL is not set. Create a .env file from .env.example."
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=10, sslmode="require")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT NOW() AS server_time;")
            row = cur.fetchone()
            print("✅ Connected. Server time:", row["server_time"])
    except Exception as e:
        print("❌ Database connection failed:", e)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
