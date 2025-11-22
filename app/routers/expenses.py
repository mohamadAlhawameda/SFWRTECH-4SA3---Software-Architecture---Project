from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Expense
from ..schemas import ExpenseCreate, ExpenseOut, SummaryOut
from ..config import BASE_CURRENCY
from ..services.currency_client import get_currency_client
from ..services.reports import get_report_strategy

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    convert_to_base: bool = Query(
        default=True,
        description="If true, convert to BASE_CURRENCY using FX API.",
    ),
):
    """
    Create a new expense.

    Demonstrates:
    - Using the CurrencyClient (Adapter + Factory) for FX conversion.
    - Persisting normalized amounts to PostgreSQL.
    """
    currency = payload.currency.upper()
    amount = payload.amount

    if convert_to_base:
        client = get_currency_client()
        rate = client.get_rate(currency, BASE_CURRENCY)
        amount_base = (amount * Decimal(str(rate))).quantize(Decimal("0.01"))
    else:
        amount_base = amount

    exp = Expense(
        amount=amount,
        currency=currency,
        amount_base=amount_base,
        base_currency=BASE_CURRENCY,
        category=payload.category,
        description=payload.description,
        spent_at=payload.spent_at or date.today(),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    category: str | None = Query(default=None, description="Optional category filter"),
):
    """
    List all expenses, optionally filtered by category.
    """
    query = db.query(Expense).order_by(Expense.spent_at.desc(), Expense.id.desc())
    if category:
        query = query.filter(Expense.category == category)
    return query.all()


# ⚠️ IMPORTANT: define /summary BEFORE /{expense_id} so "summary" is not treated as an ID.
@router.get("/summary", response_model=list[SummaryOut])
def summary(
    group_by: str = Query(
        default="category",
        description="Group by 'category' or 'date'.",
    ),
    db: Session = Depends(get_db),
):
    """
    Summarize expenses using a pluggable Strategy.

    Uses:
    - Strategy pattern (CategoryReportStrategy, DateReportStrategy)
    - get_report_strategy factory to select strategy.
    """
    try:
        strategy = get_report_strategy(group_by)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    rows = strategy.summarize(db)
    return [SummaryOut(key=row["key"], total=row["total"]) for row in rows]


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single expense by ID.
    """
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return exp


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    Delete an expense by ID (simple destructive action).
    """
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(exp)
    db.commit()
    return
