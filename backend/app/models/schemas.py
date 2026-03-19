"""API スキーマ（Pydantic モデル）の定義モジュール。"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────────
# Sentiment (センチメント分析)
# ──────────────────────────────────────────

class SentimentArticle(BaseModel):
    """センチメント分析を行う単一記事・投稿。"""

    title: str = Field(..., description="記事タイトルまたは投稿本文の先頭")
    body: str | None = Field(None, description="本文テキスト（オプション）")
    source: Literal["tdnet", "reddit", "manual"] = Field(
        "manual", description="データソース"
    )
    published_at: datetime | None = Field(None, description="公開日時")


class SentimentResult(BaseModel):
    """1 件のテキストに対するセンチメント分析結果。"""

    title: str
    score: float = Field(..., ge=-1.0, le=1.0, description="センチメントスコア (-1〜1)")
    label: Literal["positive", "neutral", "negative"]
    explanation: str = Field(..., description="スコアの根拠（Gemini が生成）")
    source: str


class SentimentBatchRequest(BaseModel):
    """センチメント分析の一括リクエスト。"""

    articles: list[SentimentArticle] = Field(..., min_length=1, max_length=50)


class SentimentBatchResponse(BaseModel):
    """センチメント分析の一括レスポンス。"""

    results: list[SentimentResult]
    average_score: float
    overall_label: Literal["positive", "neutral", "negative"]


# ──────────────────────────────────────────
# Stock Price (株価)
# ──────────────────────────────────────────

class StockPricePoint(BaseModel):
    """単一時点の株価データ。"""

    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockDataResponse(BaseModel):
    """株価データのレスポンス。"""

    ticker: str
    company_name: str | None
    currency: str
    prices: list[StockPricePoint]


# ──────────────────────────────────────────
# Prediction (株価予測)
# ──────────────────────────────────────────

class PredictionRequest(BaseModel):
    """株価予測リクエスト。"""

    ticker: str = Field(..., description="銘柄ティッカー(例: 7203.T)")
    period_days: int = Field(30, ge=7, le=365, description="過去データの取得日数")


class PredictionResponse(BaseModel):
    """株価予測レスポンス。"""

    ticker: str
    company_name: str | None
    current_price: float
    predicted_direction: Literal["up", "down", "neutral"]
    predicted_change_pct: float = Field(..., description="予測変動率 (%)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="信頼度 (0〜1)")
    sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    sentiment_label: Literal["positive", "neutral", "negative"]
    sentiment_summary: str
    news_articles: list[SentimentResult]
    price_history: list[StockPricePoint]
    generated_at: datetime


# ──────────────────────────────────────────
# TDnet / Reddit (コレクター)
# ──────────────────────────────────────────

class TdnetArticle(BaseModel):
    """TDnet から取得した開示情報。"""

    document_id: str
    company_name: str
    ticker: str | None
    title: str
    url: str
    published_at: datetime


class RedditPost(BaseModel):
    """Reddit から取得した投稿。"""

    post_id: str
    title: str
    body: str | None
    score: int
    num_comments: int
    subreddit: str
    url: str
    created_at: datetime


# ──────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────

class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス。"""

    status: str
    version: str
    timestamp: datetime
