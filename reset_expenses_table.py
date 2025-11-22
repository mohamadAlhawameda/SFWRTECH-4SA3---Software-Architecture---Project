import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    assert DATABASE_URL, "DATABASE_URL is not set."

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Dropping existing expenses table (if any)...")
    cur.execute("DROP TABLE IF EXISTS expenses;")
    conn.commit()

    cur.close()
    conn.close()
    print("✅ Dropped expenses table.")

if __name__ == "__main__":
    main()
