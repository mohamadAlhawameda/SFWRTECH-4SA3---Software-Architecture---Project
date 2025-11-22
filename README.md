# ExpenseTracker Lite
<img width="1717" height="964" alt="Screenshot 2025-11-22 at 2 08 15 PM" src="https://github.com/user-attachments/assets/b35146d9-42c8-4104-b7de-3ed18673f02e" />

This project is my term project for **SFWRTECH 4SA3 – Software Architecture**.

ExpenseTracker Lite is a small expense tracking service that:

- Stores expenses in a **cloud PostgreSQL database**
- Normalizes amounts into a **base currency** using a **live FX web API**
- Exposes a **FastAPI** web API for CRUD + reporting
- Optionally provides a small **Next.js frontend** to demo the API

The focus of the project is the **architecture and design patterns**, not production-level features.

---

## 1. Tech Stack

**Backend**

- Python 3
- FastAPI
- SQLAlchemy
- PostgreSQL (cloud DB, e.g., Supabase)
- HTTP client: `httpx`
- Environment loading: `python-dotenv`

**Third-party Web Service**

- [exchangerate.host](https://exchangerate.host/) (used via a simple Adapter)

**Frontend (optional demo UI)**

- Next.js (React, TypeScript)
- Located under `ui/`

---

## 2. Design Patterns Used

The implementation uses **three design patterns** in meaningful ways:

1. **Factory (Creational)**  
   - `services/currency_client.py` — `get_currency_client()`  
   - Selects which FX client implementation to use.  
   - This makes it easy to swap in another provider or a mock client for testing.

2. **Adapter (Structural)**  
   - `services/currency_client.py` — e.g., `ExchangerateHostClient`  
   - Wraps the external exchangerate.host HTTP API and exposes a simple method  
     `get_rate(base_currency, target_currency)`.  
   - The rest of the system does not depend on the API’s raw JSON format.

3. **Strategy (Behavioral)**  
   - `services/reports.py` — `BaseReportStrategy`, `CategoryReportStrategy`, `DateReportStrategy`  
   - `get_report_strategy(group_by)` selects the proper concrete strategy.  
   - The `/expenses/summary` endpoint uses a strategy to summarize expenses either:
     - by **category**, or  
     - by **date**,  
     without changing the controller logic.

These patterns line up with the **Logical / Development / Process Views** in my 4+1 architecture document.

---

## 3. Project Structure

```text
expensetracker-m2/
  app/
    __init__.py
    main.py                # FastAPI app, router registration
    db.py                  # SQLAlchemy engine, SessionLocal, Base
    models.py              # Expense model
    schemas.py             # Pydantic schemas (ExpenseCreate, ExpenseOut, SummaryOut)
    config.py              # Reads BASE_CURRENCY, API_BASE_URL, etc. from env
    routers/
      __init__.py
      expenses.py          # CRUD + summary endpoints for /expenses
    services/
      currency_client.py   # FX Adapter + Factory (get_currency_client)
      reports.py           # Strategy implementations for summaries
  db_connect.py            # Simple test: connect to cloud PostgreSQL and print server time
  fetch_rate_demo.py       # Simple test: call FX API and print a sample rate
  .env.example             # Example environment variables (no secrets)
  requirements.txt         # Python dependencies
  ui/                      # Optional Next.js frontend (not required to run backend)
  README.md                # This file
  .gitignore
  .git/                    # Git repo with commit history (included in submission zip)
