"""
Reporting services.

Design pattern:
- Strategy: different strategies implement summarize(db) for different groupings
  (by category, by date, etc.).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Iterable

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import Expense


class ReportStrategy(ABC):
    @abstractmethod
    def summarize(self, db: Session) -> Iterable[dict]:
        """
        Return an iterable of {'key': ..., 'total': Decimal}.
        """
        raise NotImplementedError


class CategoryReportStrategy(ReportStrategy):
    """Summarize expenses by category using amount_base."""

    def summarize(self, db: Session) -> Iterable[dict]:
        rows = (
            db.query(Expense.category.label("key"), func.sum(Expense.amount_base).label("total"))
            .group_by(Expense.category)
            .all()
        )
        return [{"key": key, "total": Decimal(total)} for key, total in rows]


class DateReportStrategy(ReportStrategy):
    """Summarize expenses by spent_at date using amount_base."""

    def summarize(self, db: Session) -> Iterable[dict]:
        rows = (
            db.query(Expense.spent_at.label("key"), func.sum(Expense.amount_base).label("total"))
            .group_by(Expense.spent_at)
            .all()
        )
        return [{"key": key.isoformat(), "total": Decimal(total)} for key, total in rows]


def get_report_strategy(group_by: str) -> ReportStrategy:
    """
    Factory to choose a report Strategy based on a simple string key.
    """
    group_by = (group_by or "category").lower()
    if group_by == "category":
        return CategoryReportStrategy()
    if group_by == "date":
        return DateReportStrategy()
    raise ValueError(f"Unsupported group_by value: {group_by}")
