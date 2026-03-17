"""FastAPI ルーター: センチメント分析エンドポイント。"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models.schemas import SentimentBatchRequest, SentimentBatchResponse
from app.services.sentiment_analyzer import (
    analyze_sentiment_batch,
    calculate_aggregate_sentiment,
)

router = APIRouter(prefix="/api/sentiment", tags=["sentiment"])
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=SentimentBatchResponse, summary="センチメント一括分析")
async def analyze_batch(req: SentimentBatchRequest) -> SentimentBatchResponse:
    """テキストリストを一括でセンチメント分析します（Gemini API 使用）。"""
    logger.info("%d 件のセンチメント分析リクエスト", len(req.articles))

    results = await analyze_sentiment_batch(req.articles)
    avg_score, overall_label = calculate_aggregate_sentiment(results)

    return SentimentBatchResponse(
        results=results,
        average_score=avg_score,
        overall_label=overall_label,
    )
