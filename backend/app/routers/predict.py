"""FastAPI ルーター: 株価予測エンドポイント。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.collectors.tdnet_scraper import fetch_latest_disclosures
from app.ml.predict import predict_stock_direction
from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    SentimentArticle,
)
from app.services.sentiment_analyzer import analyze_sentiment_batch
from app.services.stock_fetcher import fetch_stock_data

router = APIRouter(prefix="/api/predict", tags=["prediction"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=PredictionResponse, summary="株価予測を実行")
async def run_prediction(req: PredictionRequest) -> PredictionResponse:
    """指定ティッカーの株価予測を実行します。

    処理フロー:
    1. yfinance から株価履歴を取得
    2. TDnet + Reddit から関連記事を収集
    3. Gemini API でセンチメント分析
    4. 予測ロジックで方向性を算出
    """
    # 1. ティッカーの正規化（数値 4 桁なら自動的に .T を付与、銘柄名が含まれていれば除去）
    raw_ticker = req.ticker.upper()
    # 数値のみを抽出（例: "9984 ソフトバンクG" -> "9984"）
    import re
    numeric_match = re.search(r"\d{4}", raw_ticker)
    ticker = raw_ticker
    if numeric_match:
        base_code = numeric_match.group()
        if ".T" not in raw_ticker:
            ticker = f"{base_code}.T"
        else:
            ticker = f"{base_code}.T"
    
    logger.info("予測リクエスト受信: ticker=%s (変換後: %s)", req.ticker, ticker)

    # 1. 株価データ取得
    stock_data = await fetch_stock_data(ticker, period_days=req.period_days)
    if not stock_data.prices:
        # 米国株などの可能性もあるので、元の入力でもう一度試行（既に試しているが念のため）
        if ticker != raw_ticker:
            stock_data = await fetch_stock_data(raw_ticker, period_days=req.period_days)
            if stock_data.prices:
                ticker = raw_ticker

    if not stock_data.prices:
        raise HTTPException(
            status_code=404,
            detail=f"銘柄 '{req.ticker}' のデータが見つかりません。"
                   "ティッカーを確認してください（例: 7203.T, AAPL）。",
        )

    # 2. 記事・投稿を収集
    base_code = ticker.split(".")[0]
    company_name = stock_data.company_name or base_code

    tdnet_articles = await fetch_latest_disclosures(ticker=base_code, max_items=1)
    
    reddit_posts = []
    from app.collectors.reddit_scraper import fetch_reddit_posts_window
    from datetime import datetime, timezone, timedelta

    if tdnet_articles:
        # 最新の適時開示時刻を基準にする
        base_disclosure = tdnet_articles[0]
        logger.info("最新の開示時刻をトリガーに Reddit を検索: %s", base_disclosure.published_at)
        
        reddit_posts = await fetch_reddit_posts_window(
            query=company_name,
            start_time=base_disclosure.published_at,
            max_items=10
        )
    else:
        # TDnet がない場合、直近 24-48 時間の Reddit を取得（現在時刻を基準に 24h 前を開始点とする）
        logger.info("TDnet 開示が見つからないため、現在時刻を基準に Reddit を検索します。")
        fallback_start = datetime.now(timezone.utc) - timedelta(hours=24)
        reddit_posts = await fetch_reddit_posts_window(
            query=company_name,
            start_time=fallback_start,
            max_items=10,
            initial_window_hours=24
        )

    # 3. センチメント分析用に SentimentArticle に変換
    articles: list[SentimentArticle] = []

    for art in tdnet_articles:
        articles.append(
            SentimentArticle(
                title=art.title,
                body=None,
                source="tdnet",
                published_at=art.published_at,
            )
        )

    for post in reddit_posts:
        articles.append(
            SentimentArticle(
                title=post.title,
                body=post.body,
                source="reddit",
                published_at=post.created_at,
            )
        )

    # 記事がゼロの場合はダミーを 1 件投入（モック分析用）
    if not articles:
        articles.append(
            SentimentArticle(
                title=f"{company_name} stock analysis",
                body="No recent news found. Using neutral sentiment as default.",
                source="manual",
            )
        )

    # 4. Gemini でセンチメント分析（最大 20 件）
    sentiment_results = await analyze_sentiment_batch(articles[:20])

    # 5. 方向性予測
    prediction = await predict_stock_direction(
        ticker=ticker,
        company_name=company_name,
        price_history=stock_data.prices,
        sentiment_results=sentiment_results,
    )

    return prediction


@router.get("/quick", response_model=PredictionResponse, summary="クイック予測（GET）")
async def quick_prediction(
    ticker: str = Query(..., description="銘柄ティッカー（例: 7203.T）"),
    days: int = Query(30, ge=7, le=365, description="過去データ取得日数"),
) -> PredictionResponse:
    """GET で手軽に株価予測を実行します（フロントエンド向け）。"""
    return await run_prediction(PredictionRequest(ticker=ticker, period_days=days))
