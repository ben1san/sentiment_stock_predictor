"""株価データ取得サービス（yfinance ベース）。

yfinance を使って日本株・米国株の価格データを非同期で取得します。
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta

import yfinance as yf

from app.models.schemas import StockDataResponse, StockPricePoint

logger = logging.getLogger(__name__)


async def fetch_stock_data(
    ticker: str,
    period_days: int = 30,
) -> StockDataResponse:
    """yfinance から株価データを非同期で取得します。

    Args:
        ticker: Yahoo Finance ティッカー（例: "7203.T", "AAPL"）。
        period_days: 取得する過去日数。

    Returns:
        StockDataResponse。
    """
    logger.info("株価データ取得: ticker=%s days=%d", ticker, period_days)

    try:
        data = await asyncio.to_thread(_sync_fetch, ticker, period_days)
        return data
    except Exception as exc:  # noqa: BLE001
        logger.exception("株価データ取得に失敗: %s", exc)
        # エラー時は空データを返す
        return StockDataResponse(
            ticker=ticker,
            company_name=None,
            currency="JPY",
            prices=[],
        )


def _sync_fetch(ticker: str, period_days: int) -> StockDataResponse:
    """yfinance を同期で呼び出す（asyncio.to_thread から使用）。"""
    stock = yf.Ticker(ticker)
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)

    hist = stock.history(start=start_date.isoformat(), end=end_date.isoformat())

    # メタ情報
    info = {}
    try:
        info = stock.info or {}
    except Exception:  # noqa: BLE001
        pass

    company_name: str | None = (
        info.get("longName") or info.get("shortName") or None
    )
    currency: str = info.get("currency", "JPY")

    prices: list[StockPricePoint] = []
    import pandas as pd
    
    for idx, row in hist.iterrows():
        # NaN 値をチェック
        if pd.isna(row["Close"]) or pd.isna(row["Open"]):
            continue
            
        prices.append(
            StockPricePoint(
                date=idx.date(),
                open=round(float(row["Open"]), 2),
                high=round(float(row["High"]), 2),
                low=round(float(row["Low"]), 2),
                close=round(float(row["Close"]), 2),
                volume=int(row["Volume"]),
            )
        )

    return StockDataResponse(
        ticker=ticker,
        company_name=company_name,
        currency=currency,
        prices=prices,
    )


async def get_current_price(ticker: str) -> float | None:
    """現在の株価（直近終値）を返します。"""
    data = await fetch_stock_data(ticker, period_days=5)
    if data.prices:
        return data.prices[-1].close
    return None
