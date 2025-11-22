from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, description="Amount > 0")
    currency: str = Field(default="CAD", description="Currency code, e.g. CAD, USD")
    category: str
    description: str | None = None
    spent_at: date


class ExpenseOut(BaseModel):
    id: int
    amount: Decimal
    currency: str
    amount_base: Decimal
    base_currency: str
    category: str
    description: str | None
    spent_at: date
    created_at: datetime

    class Config:
        from_attributes = True  # ORM -> Pydantic


class SummaryOut(BaseModel):
    key: str
    total: Decimal
