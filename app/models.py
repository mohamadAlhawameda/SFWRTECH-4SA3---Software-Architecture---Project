from sqlalchemy import Column, Integer, String, Numeric, Date, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP

from .db import Base


class Expense(Base):
    """
    Expense record stored in PostgreSQL.

    amount       - original amount in the provided currency
    currency     - user-provided currency code, e.g. "USD"
    amount_base  - normalized amount converted to BASE_CURRENCY
    base_currency- configured base currency, e.g. "CAD"
    """

    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(8), nullable=False)

    amount_base = Column(Numeric(12, 2), nullable=False)
    base_currency = Column(String(8), nullable=False)

    category = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=True)
    spent_at = Column(Date, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
