import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")
BASE_URL = "https://api.exchangerate.host/live"

async def main():
    if not API_KEY:
        raise RuntimeError("API_KEY is not set in .env")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            BASE_URL,
            params={
                "access_key": API_KEY,
                "currencies": "CAD",   # we only care about USDCAD here
            },
        )
        response.raise_for_status()
        data = response.json()

        if not data.get("success"):
            print("❌ API error:", data)
            return

        quotes = data.get("quotes", {})
        usd_cad = quotes.get("USDCAD")
        if usd_cad is None:
            print("❌ USDCAD not found in quotes:", quotes)
            return

        print("✅ Live USD → CAD rate:", usd_cad)

if __name__ == "__main__":
    asyncio.run(main())
