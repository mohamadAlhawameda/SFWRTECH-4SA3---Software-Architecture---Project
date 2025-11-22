import os
from dotenv import load_dotenv

load_dotenv()

# Cloud database (Supabase PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it to your .env file.")

# Base currency for normalization
BASE_CURRENCY = os.getenv("BASE_CURRENCY", "CAD").upper()

# Third-party FX API (exchangerate.host via Apilayer)
EXCHANGE_API_BASE = os.getenv("EXCHANGE_API_BASE", "https://api.exchangerate.host")
EXCHANGE_API_KEY = os.getenv("API_KEY")  # your apilayer/exchangerate key
