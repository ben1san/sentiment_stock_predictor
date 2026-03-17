"""FastAPI ルーター: 株価データエンドポイント。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import StockDataResponse
from app.services.stock_fetcher import fetch_stock_data

router = APIRouter(prefix="/api/stocks", tags=["stocks"])
logger = logging.getLogger(__name__)


@router.get("/{ticker}", response_model=StockDataResponse, summary="株価データ取得")
async def get_stock_data(
    ticker: str,
    days: int = Query(30, ge=1, le=365, description="取得する過去日数"),
) -> StockDataResponse:
    """yfinance から指定銘柄の株価履歴を取得します。"""
    logger.info("株価データリクエスト: ticker=%s days=%d", ticker, days)
    data = await fetch_stock_data(ticker.upper(), period_days=days)
    if not data.prices:
        raise HTTPException(
            status_code=404,
            detail=f"銘柄 '{ticker}' のデータが見つかりません。",
        )
    return data
