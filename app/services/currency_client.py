"""
Currency client service module.

Design patterns:
- Adapter: ExchangeRateHostClient wraps the exchangerate.host (Apilayer) API
  and exposes a simple get_rate(source, target) method.
- Factory: get_currency_client() builds a CurrencyClient instance, allowing
  the rest of the app to depend on an abstraction.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import httpx

from ..config import EXCHANGE_API_BASE, EXCHANGE_API_KEY


class CurrencyClient(Protocol):
    """Abstract client interface for fetching FX rates."""

    def get_rate(self, source: str, target: str) -> float:
        ...


@dataclass
class ExchangeRateHostClient:
    base_url: str = EXCHANGE_API_BASE
    api_key: str | None = EXCHANGE_API_KEY

    def get_rate(self, source: str, target: str) -> float:
        source = source.upper()
        target = target.upper()

        if source == target:
            return 1.0

        # If we have an API key, use /live
        if self.api_key:
            url = f"{self.base_url}/live"
            params = {
                "access_key": self.api_key,
                "source": source,
                "currencies": target,
            }
            resp = httpx.get(url, params=params, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                raise RuntimeError(f"FX API error: {data}")
            quotes = data.get("quotes", {})
            pair = f"{source}{target}"
            if pair not in quotes:
                raise RuntimeError(f"Missing FX pair {pair} in {quotes.keys()}")
            return float(quotes[pair])

        # Fallback: (older behavior) /latest without key
        url = f"{self.base_url}/latest"
        params = {"base": source, "symbols": target}
        resp = httpx.get(url, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        rates = data.get("rates", {})
        if target not in rates:
            raise RuntimeError(f"Missing rate for {target} in {rates.keys()}")
        return float(rates[target])


def get_currency_client() -> CurrencyClient:
    """
    Factory for CurrencyClient implementations.
    Can be switched or mocked in tests.
    """
    return ExchangeRateHostClient()
